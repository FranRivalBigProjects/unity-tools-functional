const res=document.getElementById("res");

function run(){
 let p=+poly.value,c=+calls.value;
 if(!p||!c){res.innerText="Enter values";return;}
 let fps=60-(p/500000)-(c/200);
 res.innerText=`Estimated FPS: ${Math.max(5,fps).toFixed(1)}`;
}

