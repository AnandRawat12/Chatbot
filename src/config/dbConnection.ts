import { MongoClient, Db, UpdateFilter } from "mongodb";
import dotenv from "dotenv";
import { ChatBotModel, MessageFormat } from "../models/ChatBotModel";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI as string;
const DB_NAME = process.env.DB_NAME || "chatbot";

let db: Db;

export const connectDB = async (): Promise<Db> => {
  if (!db) {
    try {
      const client = new MongoClient(MONGO_URI);
      await client.connect();
      db = client.db(DB_NAME);
      console.log("✅ Connected to MongoDB");
    } catch (error) {
      console.error("❌ MongoDB Connection Error:", error);
      process.exit(1);
    }
  }
  return db;
};

export const findSessionById = async (sessionId: string) => {
    try {
      const db = await connectDB();
      const collection = db.collection("chatHistory");
  
      const session = await collection.findOne({ sessionId });
  
      if (!session) {
        console.log("❌ No session found for sessionId:", sessionId);
        return null;
      }
  
      console.log("✅ Found session:", session);
      return session;
    } catch (error) {
      console.error("❌ Error finding session:", error);
      throw error;
    } 
  };

 export const addSession=async(sessionId:string)=>{
  try {
    const db = await connectDB();
    const collection = db.collection("chatHistory");
    const chatBotModel:ChatBotModel= {
      sessionId:sessionId,
      messages:[]
    }
    const session = await collection.insertOne(chatBotModel);
    console.log("✅ Session added:", session);
    return session;
  } catch (error) {
    console.error("❌ Error adding session:", error);
    throw error;
  }
}

export const addMessage=async(sessionId:string,message:MessageFormat)=>{
  try {
    const db = await connectDB();
    const collection = db.collection("chatHistory");
    const session = await collection.updateOne(
      { sessionId },
      { $push: { messages: message } as UpdateFilter<ChatBotModel> }
    );
    console.log("✅ Message added:", session);
    return session;
  } catch (error) {
    console.error("❌ Error adding message:", error);
    throw error;
  }
}

export const getMessages=async(sessionId:string)=>{
  try {
    const db = await connectDB();
    const collection = db.collection("chatHistory");
    const messages = await collection.findOne({ sessionId });
    if (!messages) {
      console.log("❌ No messages found for sessionId:", sessionId);
      return null;
    }
    console.log("✅ Messages:", messages);
    return messages;
  } catch (error) {
    console.error("❌ Error getting messages:", error);
    throw error;
  }
}

