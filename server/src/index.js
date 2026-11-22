import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import {listProviderServices,getProviderBalance} from "./providers/resellersmm.js";
const app=express();app.disable("x-powered-by");
app.use(cors({origin:(process.env.CLIENT_ORIGIN||"http://localhost:5173").split(",")}));app.use(express.json({limit:"32kb"}));
app.get("/api/health",(_req,res)=>res.json({ok:true,service:"swapno-tech-smm-api"}));
app.get("/api/provider/status",(_req,res)=>res.json({configured:Boolean(process.env.RESELLERSMM_API_KEY)}));
// Admin-only auth is intentionally not yet implemented; do not expose provider calls publicly.
app.get("/api/provider/services",(_req,res)=>res.status(501).json({error:"Provider sync is not enabled until admin authentication is implemented."}));
app.get("/api/provider/balance",(_req,res)=>res.status(501).json({error:"Provider balance endpoint is disabled until admin authentication is implemented."}));
const port=Number(process.env.PORT||4000);
if(process.env.MONGODB_URI) mongoose.connect(process.env.MONGODB_URI).then(()=>console.log("MongoDB connected")).catch(e=>{console.error("MongoDB connection failed:",e.message);process.exitCode=1;});
app.listen(port,()=>console.log("API listening on :"+port));
