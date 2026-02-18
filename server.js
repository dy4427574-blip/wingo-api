const express = require("express");
const app = express();

app.use(express.json());

let history = [];

// convert number → Big Small
function toBS(n){
  return n >= 5 ? "BIG" : "SMALL";
}

function predict(){
  if(history.length < 10) return "WAIT";

  const last50 = history.slice(-50);
  const last5 = history.slice(-5);

  let bigCount = last50.filter(x => x === "BIG").length;
  let smallCount = last50.length - bigCount;

  let probBig = bigCount / last50.length;
  let probSmall = smallCount / last50.length;

  // streak detect
  let streak = 1;
  for(let i = last5.length-1; i>0; i--){
    if(last5[i] === last5[i-1]) streak++;
    else break;
  }

  if(streak >= 4){
    return last5[last5.length-1] === "BIG" ? "SMALL" : "BIG";
  }

  return probBig > probSmall ? "BIG" : "SMALL";
}

// add result
app.post("/result", (req,res)=>{
  const num = Number(req.body.number);
  if(isNaN(num)) return res.json({error:"invalid number"});

  history.push(toBS(num));
  if(history.length > 50) history.shift();

  res.json({
    added:true,
    total:history.length
  });
});

// predict
app.get("/predict",(req,res)=>{
  res.json({
    prediction: predict(),
    stored: history.length
  });
});

app.get("/",(req,res)=>res.send("Wingo AI Running"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log("Server running on",PORT));
