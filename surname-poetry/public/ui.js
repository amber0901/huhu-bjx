export function icon(name, extra='') {
  if (!/^[a-z-]+$/.test(name)) throw Error('Invalid icon');
  return `<svg class="icon ${extra}" aria-hidden="true" focusable="false"><use href="/icons.svg#${name}"></use></svg>`;
}
export function setIconButton(button, name, label) {
  button.innerHTML=icon(name);
  button.setAttribute('aria-label',label);
  button.title=label;
}
