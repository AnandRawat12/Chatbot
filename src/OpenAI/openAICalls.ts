import { OpenAI } from "openai";
import dotenv from "dotenv";
import { addMessage, getMessages } from "../config/dbConnection";
import { ChatBotModel, MessageFormat } from "../models/ChatBotModel";
import { zodFunction, zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export const chatWithGPT = async (message: string,sessionId:string) => {

const emotionCapturing = `
You are LetsTalkFriend, a virtual assistant for the LetsTalkFriend application. Your primary role is to assist users by answering their questions related to health, yoga, meditation, and mental stress.

Your responses should be accurate, empathetic, and helpful, guiding users with relevant and actionable information based on their queries.

🔹 Key Response Guidelines:
1️⃣ General Wellness Queries:
If a user asks about health, yoga, meditation, or mental stress, provide "BASIC INFORMATION" Keyword in json 
{
type:"BASIC INFORMATION",
}
2️⃣ Guidance & Professional Help:
If a user inquires about a health coach, mentor, counselor, or professional guidance, recognize that they are seeking personalized support and respond with "CONSOLER" Keyword.
1. User can answer the questions over this keyword like city, country, category of consoler.so make the desion on the based of previous conversation.
{
type:"CONSOLER",
}

Note:
======
Response should be in json format.
`

try {
// Define the response schema for emotion capturing
const emotionSchema = z.object({
  type: z.enum(["BASIC INFORMATION", "CONSOLER"]),
});

const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "system", content: emotionCapturing }, { role: "user", content: message }],
    response_format: zodResponseFormat(emotionSchema, "emotionSchema"),
    temperature: 0.7,
  });

  console.log("response::",response);
  // Parse the response - no need for a separate zodResponseParse function
  const responseContent = response.choices[0].message.content || '{"type": "BASIC INFORMATION"}';
  console.log("Emotion response:", responseContent);
  // Now we know if this is basic information or consoler type
  const parsedResponse = emotionSchema.parse(JSON.parse(responseContent));
  console.log("parsedResponse::",parsedResponse);
  const responseType = parsedResponse.type;


  if(responseType==="BASIC INFORMATION"){
  // Continue with the main chat response
  const systemPrompt = `
  You are LetsTalkFriend, a helpful assistant for the LetsTalkFriend application. Your role is to provide knowledgeable and supportive answers on health, yoga, meditation, and mental stress.
- Always introduce yourself as LetsTalkFriend in responses.
- Ensure answers are concise (30-40 words) and formatted in Markdown.
- If relevant, include supporting insights from previous questions to enhance the response.
- Maintain a friendly and encouraging tone.
`
  console.log("sessionId",sessionId);
     await addMessage(sessionId, {role:"user", content:message} as MessageFormat);
     const messages = await getMessages(sessionId);
    console.log("messages::",messages);
    // Get the detailed response
    const detailedResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt }, 
        ...(messages?.messages || [])
      ],
      temperature: 0.7
    });
    console.log("detailedResponse::",detailedResponse);
    const detailedContent = detailedResponse.choices[0].message.content || '';
    console.log("detailedContent",detailedContent);
    await addMessage(sessionId, {role:"assistant", content:detailedContent} as MessageFormat);
     return detailedContent;
  }
  else if(responseType==="CONSOLER"){
    const messages = await getMessages(sessionId);
    const systemPrompt = `
You are LetsTalkFriend, a helpful assistant for the LetsTalkFriend application. Your task is to assist users in generating a request for a list of consoler based on specific details.  

Required Information:
=====================
1. **City** – For which city does the user need the list of consoler?
3. **Country** – What is the country of the consoler?

Response Handling Rules:
========================

1. **Complete Request** 
======================= 
If the user provides all three details (**city and country**), return the following JSON response:  
{
  "status":true,
  "city": "<city name>",
  "country": "<country name>",
}

Example Input:  
*"I need the list of consolers from Bihar India"*  

Example Output:  
{
  "status": true,
  "city": "Bihar",
  "country": "India"
}

2. **Partial Request**  
======================== 
- If the user provides only one or two details (e.g., "I want a consoler from Bihar"), return a JSON with the available details and leave the missing ones empty:  
-  Partial request is also allowed.
{
  "status": true,
  "city": "<provided_city_or_empty>",
  "country": ""
}

Example Input: 
================ 
*"I want a consoler from Bihar."*  

Example Output: 
=============== 
{
  "status": true,
  "city": "Bihar",
  "country": ""
}

3. **Insufficient Details**  
==========================
If the user provides no relevant details (e.g., "I want the list of consolers"), return a JSON response indicating an incomplete request:  

{
  "status": false,
  "city": "",
  "country": "",
  "question": ""
}

OLD conversation:
=================
${JSON.stringify(messages?.messages)}

- Important condition:
======================
if in the past conversation you get the question then donot ask the same question again beacuase you should also check the last conversation question answer can be ${message}

question key content:
======================
- check the old conversation and based on the old conversation ask the question to the user in following format if bot already asked the question then don't ask again then ask next rest questions.
- Ask the user the following questions to gather the necessary details one by one means, question should be ask one by one based on the old conversation that is also provided to you:  
first question: message: "For which city do you need the list of consolers?"  
second question: message:  "What is the country for the consoler?" 

NOTE:
=====
If the status is false then add the message to the user.otherwise message should be empty.

Ensure that your responses always follow the structured JSON format above. Only finalize the request when you have captured all required details.`


const ConsolerSchema = z.object({
  status: z.boolean(),
  city: z.string().optional(),
  country: z.string().optional(),
  question: z.string().optional(),
});


await addMessage(sessionId, {role:"user", content:message} as MessageFormat);

const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "system", content: systemPrompt }],
  response_format: zodResponseFormat(ConsolerSchema, "ConsolerSchema"),
  temperature: 0.7,
});
console.log("response::",response);
const responseContent = response.choices[0].message.content || '{"status": false}';
console.log("responseContent::",responseContent);
const parsedResponse = ConsolerSchema.parse(JSON.parse(responseContent));
console.log("parsedResponse::",parsedResponse);
await addMessage(sessionId, {role:"assistant", content:parsedResponse.question} as MessageFormat);
const status = parsedResponse.status;
if(status){
    const city = parsedResponse.city as string;
    const country = parsedResponse.country as string;
    if(city && country){
    const consolerList = await fetch(`https://fastapi.mydreamfy.com/api/counselling/tutor/profile/list?status=approved&city=${city}&country=${country}`, {
      method: "GET",
    });
    const list= await consolerList.json();
    console.log(list);
    console.log(typeof list);
const listPrompt = `
Based on the generated list of consolers in json format ${JSON.stringify(list)} you should find only full_name, email. You should given a proper answer of this list like:
The list of consoler that can help you based on your query:
1. - full_name
   - email
2. - full_name
   - email
...........
- If the list is empty then give the message to the user that sorry we don't have any consoler in this city and country.
- Answer should be in markdown format.
`
const listResponse = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "system", content: listPrompt }],
  temperature: 0.7,
});
    return listResponse.choices[0].message.content;
  }
}
else{
  return parsedResponse.question;
}

  }
}
  
  catch (error) {
    console.error("❌ OpenAI API Error:", error);
    return "Error fetching response from OpenAI.";
  }
};
