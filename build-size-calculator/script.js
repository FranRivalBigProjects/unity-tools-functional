const res=document.getElementById("res");

function run(){
 let a=+assets.value,s=+avg.value;
 if(!a||!s){res.innerText="Enter values";return;}
 let total=a*s;
 res.innerText=`Estimated build size: ${total.toFixed(2)} MB`;
}

