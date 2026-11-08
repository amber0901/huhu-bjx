// Only the current listening round may reveal an activity.
export function createNarrationGate(){
  let round=0,listening=false,open=false;
  return{
    begin(){round++;listening=true;open=false;return round;},
    finish(token){if(!listening||token!==round)return false;listening=false;open=true;return true;},
    reset(){round++;listening=false;open=false;},
    get open(){return open;},
  };
}
