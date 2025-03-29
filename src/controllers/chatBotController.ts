import { Request, Response } from "express";
import { v4 as uuidv4 } from 'uuid';
import { chatWithGPT } from "../OpenAI/openAICalls";
import { addSession } from "../config/dbConnection";

export const handleData = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("handleData called with body:", req.body);
    const { message } = req.body;
    const { sessionId } = req.query;
    const sessionIdStr = typeof sessionId === "string" ? sessionId : String(sessionId || "");
    
    if (!message) {
      res.status(400).json({ error: "Message is required!" });
      return;
    }
    
    const gptresponse = await chatWithGPT(message, sessionIdStr);
    res.json({ message: gptresponse });
  } catch (error) {
    console.error("Error in handleData:", error);
    res.status(500).json({ error: "Something went wrong processing your message!" });
  }
};

export const sessionId = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("Session ID API called - HTTP Method:", req.method);
    console.log("Headers:", req.headers);
    
    // Generate a new UUID for the session
    const sessionId = uuidv4(); 
    console.log("Generated sessionId:", sessionId);
    
    try {
      // Save session to database
      const result = await addSession(sessionId);
      console.log("Session added result:", result);
      
      // Send success response
      res.status(200).json({ sessionId: sessionId });
    } catch (dbError) {
      console.error("Database error while adding session:", dbError);
      res.status(500).json({ error: "Database error while creating session" });
    }
  } catch (error) {
    console.error("Unexpected error in sessionId controller:", error);
    res.status(500).json({ error: "Failed to generate session ID" });
  }
};




