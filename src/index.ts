import express, { Response, Request, NextFunction } from "express";
import cors from "cors";
import chatBotRoutes from "./routes/chatBotRoute";
import { connectDB } from "./config/dbConnection";
const app = express();
const PORT = 3000;

// Middleware
connectDB();

app.use(cors());

// JSON parsing middleware with specific options
app.use(express.json({
  limit: '1mb',
  strict: false, // Allow non-JSON content types to be processed as empty object
  type: 'application/json'
}));

// Use Routes
app.use("/api", chatBotRoutes);

// Error handler for JSON parsing errors
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error details:', err);
  
  if (err instanceof SyntaxError && 'body' in err) {
    console.log('JSON parsing error:', err.message);
    res.status(400).json({ error: 'Invalid JSON in request body' });
  } else {
    // For other errors
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
