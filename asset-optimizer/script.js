const res=document.getElementById("res");

function run(){
 let t=+textures.value,m=+meshes.value;
 if(!t||!m){res.innerText="Enter values";return;}
 let reduction=(t*0.3)+(m*0.2);
 res.innerText=`Optimization score: ${reduction.toFixed(2)}`;
}

