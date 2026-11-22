import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const app=express();
app.disable("x-powered-by");
app.use(cors({origin:(process.env.CLIENT_ORIGIN||"http://localhost:5173").split(",").map(s=>s.trim()),credentials:true}));
app.use(express.json({limit:"32kb"}));

const UserSchema=new mongoose.Schema({name:{type:String,required:true,trim:true,maxLength:80},email:{type:String,required:true,unique:true,lowercase:true,trim:true,index:true},passwordHash:{type:String,required:true},balance:{type:Number,default:0,min:0},demo:{type:Boolean,default:false},role:{type:String,enum:["user","admin"],default:"user"}},{timestamps:true});
const ServiceSchema=new mongoose.Schema({name:{type:String,required:true},platform:{type:String,required:true},category:{type:String,required:true},rate:{type:Number,required:true,min:0},min:{type:Number,default:100},max:{type:Number,default:100000},description:{type:String,default:"Demo catalog item. Provider fulfillment is not connected."},active:{type:Boolean,default:true}},{timestamps:true});
const OrderSchema=new mongoose.Schema({userId:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true,index:true},serviceId:{type:mongoose.Schema.Types.ObjectId,ref:"Service",required:true},serviceName:String,link:String,quantity:Number,charge:Number,status:{type:String,enum:["demo","pending","processing","completed","partial","canceled"],default:"demo"},demo:{type:Boolean,default:true},externalId:String},{timestamps:true});
const DepositSchema=new mongoose.Schema({userId:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true,index:true},amount:{type:Number,required:true,min:1},method:{type:String,required:true},reference:{type:String,required:true},status:{type:String,enum:["pending","approved","rejected"],default:"pending"}},{timestamps:true});
const LedgerSchema=new mongoose.Schema({userId:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true,index:true},kind:{type:String,enum:["deposit_request","demo_order"],required:true},amount:{type:Number,required:true},note:String,reference:String},{timestamps:true});
const User=mongoose.models.User||mongoose.model("User",UserSchema);
const Service=mongoose.models.Service||mongoose.model("Service",ServiceSchema);
const Order=mongoose.models.Order||mongoose.model("Order",OrderSchema);
const Deposit=mongoose.models.Deposit||mongoose.model("Deposit",DepositSchema);
const Ledger=mongoose.models.Ledger||mongoose.model("Ledger",LedgerSchema);
let dbPromise;
async function connectDB(){if(mongoose.connection.readyState===1)return;if(!process.env.MONGODB_URI)throw new Error("Database is not configured. Set MONGODB_URI.");if(!dbPromise)dbPromise=mongoose.connect(process.env.MONGODB_URI,{serverSelectionTimeoutMS:8000});await dbPromise;}
async function seedDemo(){
 if(process.env.DEMO_ACCOUNT_ENABLED!=="true")return;
 const email=(process.env.DEMO_EMAIL||"demo@swapnotech.com").toLowerCase(),password=process.env.DEMO_PASSWORD;
 if(!password||password.length<12)throw new Error("DEMO_PASSWORD must be set to a unique password of at least 12 characters.");
 let user=await User.findOne({email});
 if(!user){user=await User.create({name:"Swapno Tech Demo",email,passwordHash:await bcrypt.hash(password,12),balance:1000,demo:true});await Ledger.create({userId:user._id,kind:"deposit_request",amount:1000,note:"Demo starting balance"});}
 if(await Service.countDocuments()===0)await Service.insertMany([{name:"Instagram Followers · Demo",platform:"Instagram",category:"Followers",rate:25,min:100,max:10000},{name:"Instagram Likes · Demo",platform:"Instagram",category:"Likes",rate:8,min:50,max:50000},{name:"YouTube Views · Demo",platform:"YouTube",category:"Views",rate:12,min:100,max:100000},{name:"TikTok Views · Demo",platform:"TikTok",category:"Views",rate:5,min:100,max:100000}]);
}
function tokenFor(user){if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32)throw new Error("Set JWT_SECRET to a random secret of at least 32 characters.");return jwt.sign({sub:String(user._id)},process.env.JWT_SECRET,{expiresIn:"7d"});}
function setSession(res,user){res.cookie("smm_session",tokenFor(user),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",maxAge:7*24*60*60*1000,path:"/"});}
function cookie(req,name){return (req.headers.cookie||"").split(";").map(x=>x.trim()).find(x=>x.startsWith(name+"="))?.slice(name.length+1);}
const asyncRoute=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
async function auth(req,res,next){try{await connectDB();const t=cookie(req,"smm_session");if(!t)return res.status(401).json({error:"Please sign in."});const p=jwt.verify(decodeURIComponent(t),process.env.JWT_SECRET);const u=await User.findById(p.sub).select("-passwordHash");if(!u)return res.status(401).json({error:"Session expired. Please sign in again."});req.user=u;next();}catch{return res.status(401).json({error:"Session expired. Please sign in again."});}}
const publicUser=u=>({id:u.id,name:u.name,email:u.email,balance:u.balance,demo:u.demo});
app.get("/api/health",asyncRoute(async(_req,res)=>{await connectDB();res.json({ok:true,service:"swapno-tech-smm-api",database:"connected"});}));
app.get("/api/demo/status",(_req,res)=>res.json({enabled:process.env.DEMO_ACCOUNT_ENABLED==="true",email:process.env.DEMO_ACCOUNT_ENABLED==="true"?(process.env.DEMO_EMAIL||"demo@swapnotech.com"):null}));
app.post("/api/auth/register",asyncRoute(async(req,res)=>{await connectDB();const name=String(req.body.name||"").trim(),email=String(req.body.email||"").trim().toLowerCase(),password=String(req.body.password||"");if(name.length<2||name.length>80)return res.status(400).json({error:"Name must be 2–80 characters."});if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return res.status(400).json({error:"Enter a valid email address."});if(password.length<10||password.length>128)return res.status(400).json({error:"Password must be 10–128 characters."});if(await User.exists({email}))return res.status(409).json({error:"An account with this email already exists."});const user=await User.create({name,email,passwordHash:await bcrypt.hash(password,12)});setSession(res,user);res.status(201).json({user:publicUser(user)});}));
app.post("/api/auth/login",asyncRoute(async(req,res)=>{await connectDB();const email=String(req.body.email||"").trim().toLowerCase(),password=String(req.body.password||"");const user=await User.findOne({email});if(!user||!await bcrypt.compare(password,user.passwordHash))return res.status(401).json({error:"Email or password is incorrect."});setSession(res,user);res.json({user:publicUser(user)});}));
app.post("/api/auth/logout",(_req,res)=>{res.clearCookie("smm_session",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/"});res.json({ok:true});});
app.get("/api/auth/me",auth,(req,res)=>res.json({user:publicUser(req.user)}));
app.get("/api/services",auth,asyncRoute(async(_req,res)=>res.json({services:await Service.find({active:true}).sort({platform:1,name:1}).lean()})));
app.get("/api/orders",auth,asyncRoute(async(req,res)=>res.json({orders:await Order.find({userId:req.user._id}).sort({createdAt:-1}).limit(100).lean()})));
app.post("/api/orders",auth,asyncRoute(async(req,res)=>{const service=await Service.findOne({_id:req.body.serviceId,active:true}),link=String(req.body.link||"").trim(),quantity=Number(req.body.quantity);if(!service)return res.status(400).json({error:"Choose an available service."});if(!/^https?:\/\//i.test(link)||link.length>2048)return res.status(400).json({error:"Enter a valid public URL."});if(!Number.isInteger(quantity)||quantity<service.min||quantity>service.max)return res.status(400).json({error:`Quantity must be between ${service.min} and ${service.max}.`});const charge=Math.round(service.rate*quantity)/1000;if(req.user.balance<charge)return res.status(400).json({error:"Insufficient wallet balance."});if(!req.user.demo)return res.status(501).json({error:"Live provider fulfillment is not configured. No funds were charged."});const updated=await User.findOneAndUpdate({_id:req.user._id,balance:{$gte:charge}},{$inc:{balance:-charge}},{new:true});if(!updated)return res.status(400).json({error:"Insufficient wallet balance."});try{const order=await Order.create({userId:req.user._id,serviceId:service._id,serviceName:service.name,link,quantity,charge,status:"demo",demo:true});await Ledger.create({userId:req.user._id,kind:"demo_order",amount:-charge,note:"Demo order #"+order.id,reference:order.id});res.status(201).json({order,balance:updated.balance,notice:"Demo only: no provider order was placed."});}catch(e){await User.updateOne({_id:req.user._id},{$inc:{balance:charge}});throw e;}}));
app.get("/api/wallet",auth,asyncRoute(async(req,res)=>{const [u,ledger,deposits]=await Promise.all([User.findById(req.user._id).select("balance demo"),Ledger.find({userId:req.user._id}).sort({createdAt:-1}).limit(100).lean(),Deposit.find({userId:req.user._id}).sort({createdAt:-1}).limit(50).lean()]);res.json({balance:u.balance,demo:u.demo,ledger,deposits});}));
app.post("/api/deposits",auth,asyncRoute(async(req,res)=>{const amount=Number(req.body.amount),method=String(req.body.method||""),reference=String(req.body.reference||"").trim();if(!Number.isFinite(amount)||amount<50||amount>1000000)return res.status(400).json({error:"Deposit must be BDT 50–1,000,000."});if(!["bKash","Nagad","Rocket","Bank"].includes(method))return res.status(400).json({error:"Choose a supported method."});if(reference.length<4||reference.length>120)return res.status(400).json({error:"Enter a valid payment reference."});if(req.user.demo)return res.status(400).json({error:"Demo account cannot submit real deposits."});const deposit=await Deposit.create({userId:req.user._id,amount,method,reference});await Ledger.create({userId:req.user._id,kind:"deposit_request",amount,note:"Deposit request via "+method,reference});res.status(201).json({deposit,notice:"Pending manual review; wallet not credited."});}));
app.use((err,_req,res,_next)=>{console.error(err);if(err?.code===11000)return res.status(409).json({error:"An account with this email already exists."});res.status(500).json({error:"Server error. Check database configuration and server logs."});});
const port=Number(process.env.PORT||4000);
if(process.env.MONGODB_URI)connectDB().then(seedDemo).then(()=>console.log("MongoDB connected")).catch(e=>console.error("Database setup failed:",e.message));
if(!process.env.VERCEL)app.listen(port,()=>console.log("API listening on :"+port));
export default app;
