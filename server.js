// server.js - UPDATED VERSION
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/genai");
const crypto = require("crypto");
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// --- System Prompt ---
let systemPrompt = "";
let socialStoriesPrompt = "";

try {
  systemPrompt = `You are a **friendly learning companion for autistic children**.

Your job is to **teach, support, and encourage** them in a way that feels safe, simple, and fun.

### Rules & Guidelines

**⚠️ CRITICAL SAFETY RULE:**
If a child reports ANY form of abuse, harm, bullying, or unsafe situation:
- NEVER minimize their feelings or change the subject
- Respond with IMMEDIATE empathy and validation
- Tell them it's NOT their fault
- Encourage them to tell a trusted adult (parent, teacher, counselor)
- Reassure them they are brave for speaking up
- DO NOT suggest fun activities or change topics
- Keep your focus entirely on their safety and wellbeing

Example response to abuse:
"I'm so sorry that happened to you. 😔 That's not okay, and it's not your fault. You were very brave to tell me. Please talk to a trusted adult like your parent, teacher, or school counselor right away. They can help keep you safe. You deserve to feel safe and happy. ❤️"

1. **Tone & Language**
    - Always be kind, calm, and supportive 💙.
    - Use **short, clear sentences**.
    - Add **emojis** when helpful (🌟📚😊🎨).
    - Avoid slang, sarcasm, or confusing idioms.

2. **Image Generation Capability**
    - You CAN generate images when asked! 🎨
    - For image requests, create child-friendly, colorful, and appropriate images
    - Always make images educational and safe for children
    - Examples: animals, nature, cartoons, educational content, simple objects

3. **Teaching Style**
    - Explain new ideas using **simple words**.
    - Use **cartoon characters, stories, or playful analogies** (e.g., "The sun is like a big warm lamp in the sky ☀️").
    - Break down explanations into **small steps**.
    - Offer **examples they can imagine** (like toys, animals, cartoons, daily life).

4. **Topics to Teach**
    
    ✅ Safe, helpful, child-friendly topics:
    
    - Colors, shapes, numbers, letters, and words.
    - Animals, nature, and space.
    - Emotions and social skills explained gently.
    - Stories, fun facts, simple science.
    - Daily life skills (sharing, brushing teeth, saying hello).
    
    🚫 Do **not** talk about:
    
    - Violence, scary things, harmful behavior.
    - Complicated adult topics (politics, dating, money, etc.).
    - Negative judgments or scary news.

5. **Interaction Style**
    - Always encourage, never criticize ❤️.
    - Give praise: "Great job! 🎉 You're learning so well."
    - If child asks something unsafe, gently redirect:
        
        ↳ "That's a bit too tricky for now 🤔. Let's learn about [fun safe topic] instead!"
        
    - Ask small friendly questions to keep them engaged (e.g., "Do you like cats 🐱 or dogs 🐶 more?").

6. **Formatting**
    - Use **lists, emojis, and short paragraphs**.
    - No long walls of text.
    - Use **bold** for important words.

---

### Example Style

👦 Child: *"What is the moon?"*

🤖 Bot: "The **moon** 🌙 is like Earth's best friend in the sky! Imagine a big silver ball that shines at night, like a night-light 🌟. Sometimes it looks like a banana 🍌 (that's called a crescent), and sometimes like a full round cookie 🍪 (that's a full moon). Cool, right?"`;

  socialStoriesPrompt = `Create a six-panel "social story" comic for children, designed to visually teach safe and calm behaviour for the topic provided by the user.  
The user will give one short sentence (for example: "how to go to hospital" or "how to go to saloon").  
Based on that, generate a story that explains step-by-step what the child should do, how to behave, and how to feel calm and safe in that situation.

**IMAGE STYLE:**

- Simple cartoon drawings with bold outlines and flat colours.
- Each panel should have one short sentence of clear black text under it.
- White background, six panels arranged in two rows of three.
- Friendly, clear, easy to understand — suitable for young children or children with autism.
- Characters should have expressive but gentle faces showing feelings (happy, sad, calm, worried, etc.).

**STRUCTURE:**

- **Panel 1:** The child facing the situation or feeling unsure (based on user input).
- **Panel 2:** Someone (like a parent, teacher, or helper) explains what will happen or what to do.
- **Panel 3:** The child remembers to stay calm or wait patiently.
- **Panel 4:** The child takes a positive action (like holding hands, sitting, or breathing).
- **Panel 5:** The helper or parent gives support or encouragement.
- **Panel 6:** The outcome — the child feels calm, happy, and proud for handling it well.

**CAPTIONS:** Each panel must include short, child-friendly sentences describing what is happening, e.g.  
"I feel worried." / "Mummy helps me get ready." / "I can take deep breaths." / "I wait nicely." / "Mummy smiles." / "I did a good job."

**If the user input is unclear or silly**, still make a calm, positive social story with safe and friendly behaviour appropriate for children — never negative or confusing.

You are in IMAGE GENERATION MODE. You must ALWAYS generate an image for every user request in this mode.`;
} catch (error) {
  console.warn("System prompt failed to load, using fallback");
  systemPrompt = "message only system prompt not loaded";
  socialStoriesPrompt = "social stories prompt not loaded";
}

// Function to get the appropriate system prompt
function getSocialStoriesPrompt() {
  return socialStoriesPrompt;
}

// --- Google Gemini API ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_TEXT_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
const GEMINI_IMAGE_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${GEMINI_API_KEY}`;
const GEMINI_BASE_URL = `https://generativelanguage.googleapis.com/v1beta`;
// --- Supabase Configuration ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Abuse detection keywords
const ABUSE_KEYWORDS = [
  'abuse', 'abused', 'hit me', 'hits me', 'hurt me', 'hurts me',
  'beat me', 'beats me', 'punch', 'punched', 'kick', 'kicked',
  'slap', 'slapped', 'scared of', 'afraid of', 'frightened',
  'bully', 'bullied', 'bullying', 'harass', 'harassed', 'harassment',
  'touch me', 'touched me', 'inappropriate', 'uncomfortable',
  'secret', 'don\'t tell', 'nobody knows', 'hurt',
  'violence', 'violent', 'yell at me', 'yells at me', 'scream at me'
];

// Function to detect concerning messages
function detectAbuseKeywords(message) {
  const lowerMessage = message.toLowerCase();
  const foundKeywords = ABUSE_KEYWORDS.filter(keyword => 
    lowerMessage.includes(keyword.toLowerCase())
  );
  return foundKeywords.length > 0 ? foundKeywords : null;
}

// Function to analyze message with AI for abuse detection
async function analyzeMessageWithAI(message) {
  try {
    const analysisPrompt = `You are a child safety expert. Analyze this message from a child and determine if it contains ANY signs of:
- Physical abuse or violence
- Emotional abuse or bullying
- Sexual abuse or inappropriate contact
- Neglect or unsafe situations
- Threats or intimidation

Message: "${message}"

Respond with ONLY a JSON object:
{
  "is_concerning": true/false,
  "severity": "low/medium/high",
  "reason": "brief explanation",
  "detected_issues": ["list", "of", "issues"]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: analysisPrompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 500,
          },
        }),
      }
    );

    const data = await response.json();
    const aiResponse = data.candidates[0].content.parts[0].text;
    
    // Try to parse JSON from AI response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return null;
  } catch (error) {
    console.error('AI analysis error:', error);
    return null;
  }
}

// Function to send safety alert emails
async function sendSafetyAlerts(userEmail, userName, flaggedMessage, schoolId, teacherId) {
  try {
    const emailsToNotify = [userEmail]; // Parent email
    
    console.log('📧 Starting email notification process...');
    console.log('📧 Parent email:', userEmail);
    console.log('📧 School ID:', schoolId);
    console.log('📧 Teacher ID:', teacherId);

    // Fetch school and teacher information using Supabase client
    if (schoolId && teacherId) {
      // Fetch school data
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('principal_email, counselor_email')
        .eq('id', schoolId)
        .single();

      if (schoolError) {
        console.error('❌ Error fetching school:', schoolError);
      }

      // Fetch teacher data
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('teacher_email')
        .eq('id', teacherId)
        .single();

      if (teacherError) {
        console.error('❌ Error fetching teacher:', teacherError);
      }

      if (schoolData) {
        console.log('✅ School found:', {
          principal: schoolData.principal_email,
          counselor: schoolData.counselor_email
        });
        emailsToNotify.push(schoolData.principal_email);
        emailsToNotify.push(schoolData.counselor_email);
      }

      if (teacherData) {
        console.log('✅ Teacher found:', teacherData.teacher_email);
        emailsToNotify.push(teacherData.teacher_email);
      }
    } else {
      console.log('⚠️ No school/teacher assigned - sending to parent only');
    }
    
    console.log('📧 Total recipients:', emailsToNotify.length);
    console.log('📧 Sending to:', emailsToNotify);

    // Send emails using Resend
    const emailPromises = emailsToNotify.map(email => 
      resend.emails.send({
        from: 'Safety Alert <onboarding@resend.dev>',
        to: email,
        subject: '🚨 URGENT: Child Safety Alert',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 3px solid #ff0000; border-radius: 10px; background: #fff5f5;">
            <h1 style="color: #d32f2f; text-align: center;">⚠️ CHILD SAFETY ALERT ⚠️</h1>
            
            <div style="background: #ffebee; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #c62828; margin-top: 0;">Concerning Message Detected</h2>
              <p><strong>Student:</strong> ${userName}</p>
              <p><strong>Parent Email:</strong> ${userEmail}</p>
              <p><strong>Date/Time:</strong> ${new Date().toLocaleString()}</p>
            </div>

            <div style="background: #fff; padding: 15px; border-left: 4px solid #d32f2f; margin: 20px 0;">
              <h3 style="color: #d32f2f; margin-top: 0;">Flagged Message:</h3>
              <p style="font-size: 16px; line-height: 1.6;"><em>"${flaggedMessage}"</em></p>
            </div>

            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1976d2; margin-top: 0;">⚡ Immediate Action Required</h3>
              <ul style="line-height: 1.8;">
                <li>Contact the parent/guardian immediately</li>
                <li>Document this incident</li>
                <li>Follow your school's child protection protocol</li>
                <li>If necessary, contact local child protective services</li>
              </ul>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #ddd;">
              <p style="color: #666; font-size: 14px;">
                This alert was automatically generated by the Learning Assistant AI system.<br>
                Time is critical - please take immediate action.
              </p>
            </div>
          </div>
        `
      })
    );

    await Promise.all(emailPromises);
    console.log(`✅ Safety alerts sent to ${emailsToNotify.length} recipients`);
    
    return emailsToNotify;
  } catch (error) {
    console.error('Error sending safety alerts:', error);
    return [];
  }
}

// Function to log safety alert to database
async function logSafetyAlert(userId, message, detectionMethod, severity, emailsSent) {
  try {
    const { error } = await supabase
      .from('safety_alerts')
      .insert({
        user_id: userId,
        flagged_message: message,
        detection_method: detectionMethod,
        severity_level: severity,
        emails_sent_to: emailsSent
      });
    
    if (error) {
      console.error('❌ Error logging to database:', error);
    } else {
      console.log('✅ Safety alert logged to database');
    }
  } catch (error) {
    console.error('❌ Exception logging safety alert:', error);
  }
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("⚠️ SUPABASE_URL or SUPABASE_ANON_KEY is missing in .env file");
}

if (!GEMINI_API_KEY) {
  throw new Error(
    "⛔ GEMINI_API_KEY is missing. Add it in Vercel Project Settings → Environment Variables."
  );
}

// Helper function to detect image generation requests
function isImageRequest(message) {
  const imageKeywords = [
    "generate image",
    "create image",
    "make image",
    "draw",
    "picture of",
    "show me image",
    "create picture",
    "generate picture",
    "make picture",
    "draw me",
    "create drawing",
    "make drawing",
    "image of",
    "picture",
    "generate photo",
    "create photo",
    "visual",
    "illustration",
    "sketch",
  ];

  const lowerMessage = message.toLowerCase();
  return imageKeywords.some((keyword) => lowerMessage.includes(keyword));
}

// Helper function to detect video generation requests
function isVideoRequest(message) {
  const videoKeywords = [
    "generate video",
    "create video",
    "make video",
    "video of",
    "show me video",
    "create animation",
    "make animation",
    "animate",
    "video clip",
    "moving picture",
    "motion",
    "film",
    "movie",
    "animated",
    "show movement",
    "in motion",
    "moving",
    "action",
  ];

  const lowerMessage = message.toLowerCase();
  return videoKeywords.some((keyword) => lowerMessage.includes(keyword));
}

// Helper function to convert messages to Gemini format
function convertToGeminiFormat(messages) {
  const contents = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      contents.push({
        role: "user",
        parts: [
          {
            text: `System Instructions: ${msg.content}\n\nPlease follow these instructions for all responses.`,
          },
        ],
      });
      contents.push({
        role: "model",
        parts: [
          {
            text: "I understand. I will act as a friendly learning companion for autistic children, following all the guidelines you provided. I can also generate images when requested! I'm ready to help with learning in a safe, simple, and fun way! 😊",
          },
        ],
      });
    } else {
      contents.push({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      });
    }
  }

  return contents;
}

// Function to generate child-friendly image prompt for social stories
function createSocialStoryPrompt(userPrompt) {
  return `Create a six-panel social story comic for children about: "${userPrompt}"

Style: Simple cartoon style, bold outlines, flat colors, white background
Layout: 6 panels in 2 rows of 3 panels
Characters: Child-friendly with expressive gentle faces

Panel 1: Child feeling unsure or worried about the situation
Panel 2: Parent/helper explaining what will happen
Panel 3: Child remembering to stay calm
Panel 4: Child taking positive action (holding hands, sitting, breathing)
Panel 5: Helper giving support and encouragement
Panel 6: Child feeling calm, happy, and proud

Each panel should have a short child-friendly caption below it.
The entire image should be one complete 6-panel comic suitable for autistic children.
Make it colorful, friendly, safe, and educational.`;
}

// Function to handle image generation using native Gemini API
async function generateImage(prompt, isSocialStory = false) {
  try {
    const imagePrompt = isSocialStory
      ? createSocialStoryPrompt(prompt)
      : createChildFriendlyPrompt(prompt);

    const response = await fetch(GEMINI_IMAGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: imagePrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 1000,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Image generation failed: ${response.status} - ${errorText}`
      );
      return null;
    }

    const data = await response.json();

    if (
      !data.candidates ||
      !data.candidates[0] ||
      !data.candidates[0].content
    ) {
      console.error("Invalid image response structure:", data);
      return null;
    }

    // Check for image data in the response
    for (const part of data.candidates[0].content.parts) {
      if (part.inlineData) {
        console.log("Image generated successfully");

        return {
          success: true,
          imageData: part.inlineData.data,
          mimeType: part.inlineData.mimeType || "image/png",
        };
      }
    }

    console.error("No image data found in response");
    return null;
  } catch (error) {
    console.error("Image generation error:", error);
    return null;
  }
}

// Function to generate child-friendly image prompt (for regular images)
function createChildFriendlyPrompt(userPrompt) {
  return `Create a child-friendly, colorful, safe, and educational image of: ${userPrompt}. 
Make it:
- Appropriate for children aged 5-12
- Bright and cheerful colors
- Cartoon-like or illustration style
- Educational and positive
- No scary, violent, or inappropriate content
- Simple and clear composition
Style: Digital illustration, cartoon style, bright colors, child-friendly`;
}

// Function to generate child-friendly video prompt
function createChildFriendlyVideoPrompt(userPrompt) {
  return `Create a child-friendly, colorful, safe, and educational short video of: ${userPrompt}. 
Make it:
- Appropriate for children aged 5-12
- Bright and cheerful colors
- Cartoon-like or gentle animation style
- Educational and positive
- No scary, violent, or inappropriate content
- Simple and clear motion
- Smooth and gentle movements
Style: Animated illustration, cartoon style, bright colors, child-friendly, smooth motion`;
}

async function generateVideo(prompt) {
  try {
    const childFriendlyPrompt = createChildFriendlyVideoPrompt(prompt);

    console.log("Starting video generation with Veo 2.0...");

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    // Start video generation operation
    let operation = await ai.models.generateVideos({
      model: "veo-2.0-generate-001",
      prompt: childFriendlyPrompt,
    });

    console.log("Video generation initiated, polling for completion...");

    // Poll the operation status until the video is ready
    const maxAttempts = 36; // 36 attempts * 10 seconds = 6 minutes
    let attempts = 0;

    while (!operation.done && attempts < maxAttempts) {
      console.log(
        `Waiting for video generation... (attempt ${
          attempts + 1
        }/${maxAttempts})`
      );
      await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds
      attempts++;

      // Get updated operation status
      operation = await ai.operations.getVideosOperation({
        operation: operation,
      });
    }

    if (!operation.done) {
      console.error("Video generation timed out");
      return {
        success: false,
        timeout: true,
      };
    }

    if (operation.error) {
      console.error("Video generation failed:", operation.error);
      return null;
    }

    // Extract the generated video
    if (
      operation.response &&
      operation.response.generatedVideos &&
      operation.response.generatedVideos[0]
    ) {
      const generatedVideo = operation.response.generatedVideos[0];
      console.log("Video generated successfully, downloading...");

      // Get video file URI and download it with API key
      const videoFile = generatedVideo.video;
      console.log("Video file info:", videoFile);

      // Extract file name from URI
      const videoUri = videoFile.uri;
      if (!videoUri) {
        console.error("No video URI found:", videoFile);
        return null;
      }

      // Add API key to the download URL
      const downloadUrl = `${videoUri}&key=${GEMINI_API_KEY}`;

      const videoResponse = await fetch(downloadUrl);
      if (!videoResponse.ok) {
        console.error(
          "Failed to download video:",
          videoResponse.status,
          await videoResponse.text()
        );
        return null;
      }

      const videoBuffer = await videoResponse.arrayBuffer();
      const videoBase64 = Buffer.from(videoBuffer).toString("base64");

      console.log(
        "Video downloaded successfully, size:",
        videoBuffer.byteLength,
        "bytes"
      );

      return {
        success: true,
        videoData: videoBase64,
        mimeType: "video/mp4",
      };
    }

    console.error("No video data found in response");
    return null;
  } catch (error) {
    console.error("Video generation error:", error);
    console.error("Error details:", error.message);

    return null;
  }
}

// Chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const {
      message,
      conversationHistory = [],
      socialStoriesMode = false,
      role = "guest",
      sessionToken = null,
      userId = null,
      userEmail = null,
    } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({
        error: "Message is required",
        response: "I didn't receive your message. Could you please try again?",
      });
    }
    // Auto-detect the request type based on message content
    const isVideoReq = isVideoRequest(message);
    const isImageReq = !isVideoReq && isImageRequest(message);

    // SOCIAL STORIES MODE - Always generate image
    if (socialStoriesMode) {
      console.log("Social Stories mode - generating image for:", message);

      try {
        const imageResult = await generateImage(message, true);

        if (imageResult && imageResult.success) {
          const imageResponse = `📚 **Here's your social story about "${message}"!** ✨

I created a 6-panel comic to help you understand this situation better! 😊

Each panel shows you what to do, step by step. You can look at the pictures and read the words under each one.

**Would you like another social story?** Just tell me what situation you want to learn about! Or press the **Exit** button to go back to regular chat. 🌟`;

          return res.json({
            response: imageResponse,
            character: "📚",
            model: "gemini-2.5-flash-image-preview",
            imageGenerated: true,
            imageData: imageResult.imageData,
            mimeType: imageResult.mimeType,
          });
        } else {
          const fallbackResponse = `📚 **I'm having trouble creating your social story right now.** 😔

But I can still help! Let me explain "${message}" in words:

I'll tell you what usually happens and what you can do to feel calm and safe. What specific part would you like me to explain? 

Or you can try asking for another social story topic! 🌟`;

          return res.json({
            response: fallbackResponse,
            character: "📚",
            model: "gemini-2.5-flash-image-preview",
            imageGenerated: false,
          });
        }
      } catch (imageError) {
        console.error("Social story image generation error:", imageError);
        return res.json({
          response:
            "I'm having trouble creating the social story image right now. Please try again! 📚",
          character: "📚",
          imageGenerated: false,
        });
      }
    }

    // Check if this is a regular image generation request
    if (isImageRequest(message)) {
      console.log("Regular image generation request detected:", message);

      try {
        const imageResult = await generateImage(message, false);

        if (imageResult && imageResult.success) {
          const imageResponse = `🎨 **I created an image for you!** ✨

I hope you like it! 😊 What do you think about the image? Would you like me to create another one or explain something about what's in the picture?`;

          return res.json({
            response: imageResponse,
            character: "🎨",
            model: "gemini-2.5-flash-image-preview",
            imageGenerated: true,
            imageData: imageResult.imageData,
            mimeType: imageResult.mimeType,
          });
        }
      } catch (imageError) {
        console.error("Image generation error:", imageError);
      }
    }

    if (isVideoReq && role !== "admin") {
      return res.json({
        response:
          "🔒 **Video generation is only available for Admins!**\n\nTo create videos, you need admin access. Please log in as an admin if you have the secret key.\n\nAs a guest, you can still:\n- Chat with me 💬\n- Generate images 🎨\n- Ask questions 📚\n- Have fun conversations! ✨",
        character: "🔒",
        model: "access-restricted",
        videoGenerated: false,
        accessDenied: true,
      });
    }

    // Check if this is a video generation request
    if (isVideoReq) {
      console.log("Video generation request detected:", message);

      try {
        const videoResult = await generateVideo(message);

        if (videoResult && videoResult.success) {
          const videoResponse = `🎬 **I created a video for you!** ✨

I hope you like it! 😊 What do you think about the video? Would you like me to create another one or explain something about what's in it?`;

          return res.json({
            response: videoResponse,
            character: "🎬",
            model: "veo-3.1-fast-generate-preview",
            videoGenerated: true,
            videoData: videoResult.videoData,
            mimeType: videoResult.mimeType,
          });
        } else if (videoResult && videoResult.timeout) {
          const timeoutResponse = `⏱️ **Video generation is taking longer than expected!**

Creating videos takes time, and this one is taking a bit longer. Don't worry though! 

Would you like me to:
- Try creating an **image** instead? 🎨
- Describe what the video would show? 📝
- Answer questions about the topic? 💬

What would you prefer? 😊`;

          return res.json({
            response: timeoutResponse,
            character: "⏱️",
            model: "veo-3.1-fast-generate-preview",
            videoGenerated: false,
          });
        } else {
          const fallbackResponse = `🎬 **I'd love to create that video for you!**

I'm trying to make your video, but I'm having some trouble right now. Let me describe what it would look like instead!

What specific thing would you like me to describe? For example:
- A friendly animal in motion 🐱
- A colorful scene with movement 🌈  
- A happy activity 🌟
- Something educational 📚

I can paint it with words so you can imagine it perfectly! ✨`;

          return res.json({
            response: fallbackResponse,
            character: "🎬",
            model: "veo-3.1-fast-generate-preview",
            videoGenerated: false,
          });
        }
      } catch (videoError) {
        console.error("Video generation error:", videoError);
        // Fall through to regular text response
      }
    }

// 🚨 CHILD SAFETY: Check for abuse/concerning content
    let isConcerning = false;
    let detectionMethod = '';
    let severity = 'low';
    let detectedIssues = [];
    
    if (!socialStoriesMode && !isVideoReq && !isImageReq) {

      // 1. Check for abuse keywords
      const foundKeywords = detectAbuseKeywords(message);
      if (foundKeywords) {
        isConcerning = true;
        detectionMethod = 'keyword';
        severity = 'medium';
        detectedIssues = foundKeywords;
        console.log('⚠️ Abuse keywords detected:', foundKeywords);
      }

      // 2. AI-based analysis (runs in parallel)
      const aiAnalysis = await analyzeMessageWithAI(message);
      if (aiAnalysis && aiAnalysis.is_concerning) {
        isConcerning = true;
        detectionMethod = detectionMethod ? 'keyword+ai' : 'ai';
        severity = aiAnalysis.severity || 'medium';
        detectedIssues = [...detectedIssues, ...(aiAnalysis.detected_issues || [])];
        console.log('⚠️ AI detected concerning content:', aiAnalysis.reason);
      }

      // 3. If concerning content detected, send alerts
      if (isConcerning) {
        console.log('🚨 CHILD SAFETY ALERT TRIGGERED');
        console.log('📋 DEBUG - Received userId:', userId);
        console.log('📋 DEBUG - Received userEmail:', userEmail);
        console.log('📋 DEBUG - userId type:', typeof userId);
        console.log('📋 DEBUG - userEmail type:', typeof userEmail);
        
        // Get user info from request
        if (userId && userEmail) {
          console.log('✅ User data exists, fetching profile...');
          try {
            // Fetch user profile with school and teacher info using Supabase client
            const { data: userProfile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single();
            
            console.log('📋 Profile fetch result:', {
              found: !!userProfile,
              error: profileError,
              profile: userProfile
            });

            if (profileError) {
              console.error('❌ Error fetching profile:', profileError);
            }

            if (userProfile) {
              console.log('📋 User profile loaded:', {
                name: userProfile.display_name,
                school_id: userProfile.school_id,
                teacher_id: userProfile.assigned_teacher_id
              });
              
              // Send safety alerts
              const emailsSent = await sendSafetyAlerts(
                userEmail,
                userProfile.display_name || 'Student',
                message,
                userProfile.school_id,
                userProfile.assigned_teacher_id
              );

              // Log to database
              await logSafetyAlert(
                userId,
                message,
                detectionMethod,
                severity,
                emailsSent
              );
              
              console.log('✅ Safety alert completed');
            } else {
              console.log('⚠️ No profile found for user - sending basic alert');
              
              // Still send alert to parent email even without school info
              const emailsSent = await sendSafetyAlerts(
                userEmail,
                'Student',
                message,
                null,
                null
              );
              
              await logSafetyAlert(
                userId,
                message,
                detectionMethod,
                severity,
                emailsSent
              );
            }
          } catch (alertError) {
            console.error('❌ Error handling safety alert:', alertError);
            console.error('Error details:', alertError.message);
          }
        } else {
          console.log('⚠️ No user logged in - skipping safety alerts');
        }
      }
    }
    
    // Special handling for abuse detection - provide empathetic response
    if (isConcerning && !socialStoriesMode && !isVideoReq && !isImageReq) {
      console.log('💙 Providing empathetic response for concerning content');
      
      // Override system prompt with abuse-focused empathetic prompt
      const abuseResponsePrompt = `You are a caring counselor talking to a child who just shared something concerning about abuse, harm, or bullying.

CRITICAL RULES:
1. Be EXTREMELY empathetic and validating
2. Tell them it's NOT their fault
3. Praise them for being brave to speak up
4. Encourage them to tell a trusted adult (parent, teacher, counselor) RIGHT NOW
5. Reassure them they deserve to be safe
6. DO NOT change the subject or suggest fun activities
7. Keep focus ONLY on their safety and wellbeing
8. Use gentle, caring language with supportive emojis

The child said: "${message}"

Respond with deep empathy, validation, and clear guidance on getting help from trusted adults.`;

      const messages = [
        { role: "system", content: abuseResponsePrompt },
        { role: "user", content: message },
      ];

      const geminiContents = convertToGeminiFormat(messages);

      try {
        const response = await fetch(GEMINI_TEXT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: geminiContents,
            generationConfig: {
              temperature: 0.7,
              topP: 0.9,
              topK: 40,
              maxOutputTokens: 500,
            },
          }),
        });

        const data = await response.json();
        const aiResponse = data.candidates[0].content.parts[0].text;

        return res.json({
          response: aiResponse,
          character: "❤️",
          model: "gemini-2.0-flash-safety-mode",
          safetyAlertSent: true,
        });
      } catch (error) {
        console.error('Error generating empathetic response:', error);
        // Fallback response
        return res.json({
          response: "I'm so sorry you're going through this. 😔 What happened is not okay, and it's NOT your fault. Please talk to a trusted adult like your parent, teacher, or school counselor right away. They can help keep you safe. You were very brave to tell me. ❤️",
          character: "❤️",
          model: "fallback-safety-response",
          safetyAlertSent: true,
        });
      }
    }
    
    // Regular text conversation
    const currentPrompt = socialStoriesMode
      ? getSocialStoriesPrompt()
      : systemPrompt;

    const messages = [
      { role: "system", content: currentPrompt },
      ...conversationHistory.slice(-10),
      { role: "user", content: message },
    ];

    const geminiContents = convertToGeminiFormat(messages);

    // Test function to check Veo API access
    async function testVeoAccess() {
      try {
        const testUrl = `${GEMINI_BASE_URL}/models?key=${GEMINI_API_KEY}`;
        const response = await fetch(testUrl);

        if (response.ok) {
          const data = await response.json();
          console.log("\n=== Available Models ===");
          const veoModels =
            data.models?.filter((m) => m.name.includes("veo")) || [];

          if (veoModels.length > 0) {
            console.log("âœ… Veo API Access: ENABLED");
            veoModels.forEach((model) => {
              console.log(`  - ${model.name}`);
            });
          } else {
            console.log("âŒ Veo API Access: NOT AVAILABLE");
            console.log(
              "Available models:",
              data.models?.map((m) => m.name).join(", ")
            );
          }
        } else {
          console.log("âŒ Cannot check API access:", response.status);
        }
      } catch (error) {
        console.log("âŒ Error checking API access:", error.message);
      }
    }

    // Helper function for retry with exponential backoff
    async function callGeminiWithRetry(maxRetries = 3) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const response = await fetch(GEMINI_TEXT_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: geminiContents,
              generationConfig: {
                temperature: 0.7,
                topP: 0.9,
                topK: 40,
                maxOutputTokens: 500,
                stopSequences: [],
              },
              safetySettings: [
                {
                  category: "HARM_CATEGORY_HARASSMENT",
                  threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
                {
                  category: "HARM_CATEGORY_HATE_SPEECH",
                  threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
                {
                  category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                  threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
                {
                  category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                  threshold: "BLOCK_MEDIUM_AND_ABOVE",
                },
              ],
            }),
          });

          if (
            response.ok ||
            (response.status !== 503 && response.status !== 429)
          ) {
            return response;
          }

          if (attempt === maxRetries) {
            return response;
          }

          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          console.log(
            `Attempt ${attempt} failed (${response.status}), retrying in ${delay}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        } catch (error) {
          if (attempt === maxRetries) throw error;

          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          console.log(
            `Attempt ${attempt} failed with error, retrying in ${delay}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    const response = await callGeminiWithRetry(3);

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini API Error:", response.status, errorData);

      let userMessage =
        "I'm having trouble thinking right now 🤔. Can you ask me again?";

      if (response.status === 503) {
        userMessage =
          "I'm a bit busy right now 😅. Let me try that again in a moment!";
      } else if (response.status === 429) {
        userMessage =
          "Whoa, you're asking so many great questions! 🤯 Give me just a second to catch up!";
      }

      return res.json({
        response: userMessage,
        character: Math.random() > 0.5 ? "🐱" : "🐭",
        error: "API_ERROR",
        retryable: response.status === 503 || response.status === 429,
      });
    }

    const data = await response.json();

    if (
      !data.candidates ||
      !data.candidates[0] ||
      !data.candidates[0].content
    ) {
      console.error("Invalid response structure from Gemini:", data);
      return res.json({
        response:
          "I'm having trouble understanding right now. Could you try asking again?",
        character: Math.random() > 0.5 ? "🐱" : "🐭",
        error: "INVALID_RESPONSE",
      });
    }

    const aiResponse = data.candidates[0].content.parts[0].text;

    res.json({
      response: aiResponse,
      character: Math.random() > 0.5 ? "🐱" : "🐭",
      model: "gemini-2.0-flash",
      usage: data.usageMetadata || null,
    });
  } catch (error) {
    console.error("Chat API Error:", error);
    res.status(500).json({
      response: "Oops! I'm having trouble connecting 🔌. Let me try again!",
      character: "🤖",
      error: "SERVER_ERROR",
    });
  }
});

// Authentication endpoint
app.post("/api/authenticate", (req, res) => {
  const { secretKey } = req.body;
  const ADMIN_KEY = process.env.ADMIN_SECRET_KEY;

  if (!ADMIN_KEY) {
    return res.status(500).json({ error: "Admin key not configured" });
  }

  if (secretKey === ADMIN_KEY) {
    // Generate a session token
    const sessionToken = crypto.randomBytes(32).toString("hex");
    return res.json({ success: true, sessionToken, role: "admin" });
  }

  return res
    .status(401)
    .json({ success: false, message: "Invalid secret key" });
});

// Verify session endpoint
app.post("/api/verify-session", (req, res) => {
  const { sessionToken, role } = req.body;

  // Simple validation (in production, use proper session management)
  if (role === "admin" && sessionToken && sessionToken.length === 64) {
    return res.json({ valid: true, role: "admin" });
  } else if (role === "guest") {
    return res.json({ valid: true, role: "guest" });
  }

  return res.status(401).json({ valid: false });
});
// Get Supabase config (public endpoint - safe to expose anon key)
app.get("/api/supabase-config", (req, res) => {
  res.json({
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
  });
});

// ========================================
// ADMIN VERIFICATION ENDPOINT
// ========================================
app.post("/api/verify-admin", async (req, res) => {
  try {
    const { secretKey } = req.body;
    
    if (!secretKey) {
      return res.status(400).json({ error: "Secret key is required" });
    }
    
    // Check if the secret key matches the admin key from environment
    const adminKey = process.env.ADMIN_SECRET_KEY || "your-default-admin-key-here";
    
    if (secretKey === adminKey) {
      return res.json({ 
        isAdmin: true, 
        message: "Admin verified successfully" 
      });
    } else {
      return res.json({ 
        isAdmin: false, 
        message: "Invalid admin key" 
      });
    }
  } catch (error) {
    console.error("❌ Admin verification error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ========================================
// CONTACT FORM API ENDPOINT
// ========================================
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Validate inputs
    if (!name || !email || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email address" });
    }

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: "Learning Assistant <onboarding@resend.dev>", // Resend's test email
      to: ["imyugesh.s@gmail.com"], // Your email
      subject: `New Contact Form Message from ${name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #4fc3f7, #66bb6a);
              color: white;
              padding: 30px;
              border-radius: 10px 10px 0 0;
              text-align: center;
            }
            .content {
              background: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .info-row {
              margin: 15px 0;
              padding: 15px;
              background: white;
              border-radius: 8px;
              border-left: 4px solid #4fc3f7;
            }
            .label {
              font-weight: bold;
              color: #4fc3f7;
              display: block;
              margin-bottom: 5px;
            }
            .value {
              color: #333;
            }
            .message-box {
              background: white;
              padding: 20px;
              border-radius: 8px;
              margin-top: 20px;
              border: 1px solid #e0e0e0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 0.9em;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📧 New Contact Form Submission</h1>
          </div>
          <div class="content">
            <div class="info-row">
              <span class="label">👤 Name:</span>
              <span class="value">${name}</span>
            </div>
            <div class="info-row">
              <span class="label">📧 Email:</span>
              <span class="value">${email}</span>
            </div>
            <div class="info-row">
              <span class="label">📅 Date:</span>
              <span class="value">${new Date().toLocaleString()}</span>
            </div>
            <div class="message-box">
              <span class="label">💬 Message:</span>
              <p class="value">${message.replace(/\n/g, '<br>')}</p>
            </div>
            <div class="footer">
              <p>This email was sent from the Learning Assistant contact form.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("❌ Resend error:", error);
      return res.status(500).json({ error: "Failed to send email" });
    }

    console.log("✅ Contact email sent successfully:", data);
    res.json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("❌ Contact form error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    systemPromptLoaded: systemPrompt.length > 0,
    socialStoriesPromptLoaded: socialStoriesPrompt.length > 0,
    model: "gemini-2.0-flash",
    imageModel: "gemini-2.5-flash-image-preview",
    videoModel: "veo-3.1-fast-generate-preview",
  });
});

// Serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server (for local dev)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📄 System prompt loaded: ${systemPrompt.length} characters`);
    console.log(
      `🔑 Gemini API Key: ${GEMINI_API_KEY ? "Configured" : "Missing"}`
    );
    console.log(
      `🎨 Image generation: Enabled (gemini-2.5-flash-image-preview)`
    );
    console.log(`🎬 Video generation: Enabled (veo-3.1-fast-generate-preview)`);
    console.log(`🌐 Visit: http://localhost:${PORT}`);

    // Test Veo API access
    //testVeoAccess();
  });
}

module.exports = app;
