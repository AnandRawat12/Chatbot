export enum MessageType {
    User = "user",
    Bot = "bot"
  }
  
export interface MessageFormat {
    role: string;
    content: string;
  }
  
 export interface ChatBotModel {
    sessionId: string;
    messages: Array<MessageFormat>;
  }
  