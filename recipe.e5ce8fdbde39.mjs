// Free toppings; serving never requires an ingredient.
export class Recipe {
  constructor(){this.stage='cooking';this.scallions=0;this.cilantro=0;this.crisp=false;this.fold=0;this.busy=false;}
  start(){if(this.stage!=='cooking')return false;this.stage='sauce';return true;}
  canFinishSauce(stats){return true;}
  finishSauce(stats){if(this.stage!=='sauce'||this.busy||!this.canFinishSauce(stats))return false;this.stage='greens';return true;}
  moreSauce(){if(this.stage!=='greens'||this.busy)return false;this.stage='sauce';return true;}
  add(kind){if(!['sauce','greens'].includes(this.stage)||this.busy||!['scallions','cilantro'].includes(kind))return false;this[kind]++;return true;}
  finishGreens(){if(this.stage!=='greens'||this.busy)return false;this.stage='crisp';return true;}
  placeCrisp(){if(this.stage!=='crisp'||this.busy)return false;this.crisp=true;this.stage='sauce';return true;}
  foldNext(){if(this.stage!=='fold'||this.busy)return false;this.fold++;if(this.fold===3)this.stage='serving';return true;}
}
