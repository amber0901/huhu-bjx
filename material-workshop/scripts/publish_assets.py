#!/usr/bin/env python3
"""Validate a reviewed release and copy only declared runtime files."""

import argparse
import json
import math
import os
from pathlib import Path
import re
import shutil
import sys
import tempfile

ID = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
EXTENSIONS = {
    "background": {".webp", ".png", ".jpg", ".jpeg"},
    "narration": {".mp3", ".wav", ".ogg"},
    "timing": {".json"},
    "music": {".mp3", ".wav", ".ogg"},
    "guidance": {".mp3", ".wav", ".ogg"},
    "companion": {".png", ".webp"},
}
REQUIRED_ASSETS = {"background", "narration", "timing", "music"}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read_json(file):
    return json.loads(file.read_text(encoding="utf-8"))


def validate(release):
    require(release.is_dir(), f"发布包目录不存在：{release}")
    metadata = release / "poem.json"
    require(metadata.is_file() and not metadata.is_symlink(), "缺少真实的 release/poem.json")
    poem = read_json(metadata)
    require(isinstance(poem, dict), "poem.json 必须是对象")
    require(isinstance(poem.get("id"), str) and ID.fullmatch(poem["id"]), "诗歌 ID 只支持小写字母、数字和连字符")
    require(poem.get("status") == "ready", "审核完成后，才能将 release/poem.json 的 status 改为 ready")
    for key in ["title", "author"]:
        require(isinstance(poem.get(key), str) and poem[key].strip(), f"缺少 {key}")
    lines = poem.get("lines")
    require(isinstance(lines, list) and lines and all(isinstance(line, str) and line.strip() for line in lines), "诗句列表无效")
    surnames = poem.get("surnames")
    require(isinstance(surnames, list) and surnames, "至少需要一个匹配姓氏")
    for surname in surnames:
        require(isinstance(surname, str) and surname.strip() and any(surname in line for line in lines), "姓氏必须出现在诗句正文中")
    if 'interaction' in poem:
        interaction = poem['interaction']
        require(isinstance(interaction, dict) and interaction.get('targetSurname') == surnames[0], '互动目标必须与诗句匹配的姓氏一致')
        if interaction.get('game')=='assemble-character':
            require(surnames[0]=='李' and interaction.get('parts')==['木','子'],'当前李字拼合必须使用木、子两个部件')
        elif poem.get('interactionMode')=='surname-poem-play':
            require(isinstance(interaction.get('game'),str) and isinstance(interaction.get('description'),str),'缺少独立诗词互动配置')
        else:
            choices = interaction.get('homeChoices')
            require(isinstance(choices, list) and len(choices) == 3 and all(isinstance(value, str) and value.strip() for value in choices) and len(set(choices)) == 3 and surnames[0] in choices, '小屋门牌必须有三个不同姓氏并包含目标姓氏')
    assets = poem.get("assets")
    require(isinstance(assets, dict) and REQUIRED_ASSETS <= set(assets) <= set(EXTENSIONS), "assets 必须声明 background、narration、timing、music，可附 guidance 或 companion")
    files = [metadata]
    for kind, allowed in EXTENSIONS.items():
        if kind not in assets:
            continue
        name = assets[kind]
        require(isinstance(name, str) and name and not name.startswith(".") and "/" not in name and "\\" not in name, f"{kind} 必须是发布包内的普通文件名")
        require(Path(name).suffix.lower() in allowed, f"{kind} 扩展名不支持")
        file = release / name
        require(file.is_file() and not file.is_symlink() and file.stat().st_size > 0, f"素材缺失、为空或为符号链接：{name}")
        files.append(file)
    require(len({file.name for file in files}) == len(files), "每项资源必须使用独立文件名")
    timing = read_json(release / assets["timing"])
    require(isinstance(timing, dict) and timing.get("unit") == "seconds", "时间轴单位必须是 seconds")
    timestamps = timing.get("lines")
    require(isinstance(timestamps, list) and len(timestamps) == len(lines), "时间轴必须对应每一句诗")
    previous = 0
    for index, (text, item) in enumerate(zip(lines, timestamps), 1):
        require(isinstance(item, dict) and item.get("text") == text, f"时间轴第 {index} 句文字不匹配")
        start, end = item.get("start"), item.get("end")
        require(all(type(value) in (int, float) and math.isfinite(value) for value in (start, end)), f"时间轴第 {index} 句必须填写有限数值")
        require(start >= previous and end > start, f"时间轴第 {index} 句时间顺序错误")
        previous = end
    return poem, files


def publish(release, deploy_root, replace=False):
    deploy_root = deploy_root.resolve()
    poem, files = validate(release)
    catalog_file = deploy_root / "data/catalog.json"
    require(catalog_file.is_file(), "目标不是部署项目：缺少 data/catalog.json")
    catalog = read_json(catalog_file)
    require(catalog.get("schemaVersion") == 1 and isinstance(catalog.get("poems"), list), "部署素材目录格式无效")
    entries = catalog["poems"]
    require(all(isinstance(entry, dict) and isinstance(entry.get("id"), str) and ID.fullmatch(entry["id"]) for entry in entries), "现有目录中有无效 ID")
    require(len({entry["id"] for entry in entries}) == len(entries), "现有目录中有重复 ID")
    assets_root = deploy_root / "public/assets/poems"
    assets_root.mkdir(parents=True, exist_ok=True)
    require(assets_root.resolve().is_relative_to(deploy_root), "部署素材目录不能链接到项目外")
    destination = assets_root / poem["id"]
    require(not destination.is_symlink(), "目标素材目录不能是符号链接")
    exists = destination.exists() or any(entry["id"] == poem["id"] for entry in entries)
    require(not exists or replace, "该 ID 已发布；审核新版本后使用 --replace")
    updated = {**catalog, "poems": [entry for entry in entries if entry["id"] != poem["id"]] + [{"id": poem["id"]}]}
    updated["poems"].sort(key=lambda entry: entry["id"])
    # 暂存文件在目标磁盘，目录移动与 JSON 替换不跨文件系统。
    with tempfile.TemporaryDirectory(prefix=".publish-", dir=assets_root) as temporary:
        staging = Path(temporary) / "new"
        staging.mkdir()
        for file in files:
            shutil.copy2(file, staging / file.name)
        backup = Path(temporary) / "previous"
        catalog_staging = Path(temporary) / "catalog.json"
        catalog_staging.write_text(json.dumps(updated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        had_previous = destination.exists()
        if had_previous:
            destination.rename(backup)
        installed = False
        try:
            staging.rename(destination)
            installed = True
            os.replace(catalog_staging, catalog_file)
        except Exception:
            if installed:
                shutil.rmtree(destination)
            if had_previous:
                backup.rename(destination)
            raise
    return destination


def main():
    parser = argparse.ArgumentParser(description="校验并发布诗歌素材，不调用生成接口，不读取密钥。")
    parser.add_argument("project", type=Path, help="素材项目目录，其下必须有 release/")
    parser.add_argument("--deploy-root", type=Path, default=Path(__file__).resolve().parents[2] / "surname-poetry")
    parser.add_argument("--check", action="store_true", help="只校验，不复制")
    parser.add_argument("--replace", action="store_true", help="替换已发布的同 ID 素材")
    args = parser.parse_args()
    try:
        release = args.project.resolve() / "release"
        if args.check:
            poem, _ = validate(release)
            print(f"发布包结构检查通过：{poem['id']}")
        else:
            destination = publish(release, args.deploy_root.resolve(), args.replace)
            print(f"已发布：{destination}")
            print("提交部署前，请运行 scripts/optimize_runtime_assets.py 更新压缩文件和缓存版本，再在部署目录运行 npm run check:assets。")
    except (OSError, ValueError, TypeError, KeyError) as error:
        print(f"发布停止：{error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
