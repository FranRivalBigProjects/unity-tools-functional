const res=document.getElementById("res");

function run(){
 let c=+calls.value;
 if(!c){res.innerText="Enter value";return;}
 res.innerText=c>1000?"Too many draw calls":"Optimized";
}

