import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, ThinkingLevel, Modality } from '@google/genai';
import { auth, signInWithPopup, googleProvider, signOut, db, doc, setDoc, onSnapshot } from '../firebase';
import { User } from 'firebase/auth';
import Markdown from 'react-markdown';
import { BrainCircuit, Image as ImageIcon, Video, Mic, Send, Upload, User as UserIcon, LogOut, Loader2, Settings, Sparkles, Search, MessageSquare, Zap } from 'lucide-react';

// --- AUTH COMPONENT ---
export const AuthProfile = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) {
        // Save basic user info to Firestore
        setDoc(doc(db, 'users', u.uid), {
          uid: u.uid,
          email: u.email,
          displayName: u.displayName,
          photoURL: u.photoURL,
          createdAt: new Date().toISOString()
        }, { merge: true });
      }
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border border-emerald-900/50 bg-black/60 rounded-xl">
        <UserIcon className="w-12 h-12 text-emerald-500 mb-4" />
        <h2 className="text-xl font-bold text-emerald-400 mb-2">NEURAL IDENTITY REQUIRED</h2>
        <p className="text-emerald-600 mb-6 text-center">Authenticate to access advanced AI modules and synchronize your neural data.</p>
        <button onClick={login} className="bg-emerald-900/50 hover:bg-emerald-800 border border-emerald-500 text-emerald-300 px-6 py-2 rounded font-bold transition-all flex items-center gap-2">
          <Zap className="w-4 h-4" /> INITIALIZE CONNECTION
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 border border-emerald-900/50 bg-black/60 rounded-xl">
      <div className="flex items-center gap-4">
        {user.photoURL ? (
          <img src={user.photoURL} alt="Profile" className="w-12 h-12 rounded-full border border-emerald-500" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-12 h-12 rounded-full border border-emerald-500 flex items-center justify-center bg-emerald-900/30">
            <UserIcon className="w-6 h-6 text-emerald-400" />
          </div>
        )}
        <div>
          <div className="font-bold text-emerald-400">{user.displayName || 'ANONYMOUS_USER'}</div>
          <div className="text-xs text-emerald-600">{user.email}</div>
        </div>
      </div>
      <button onClick={() => signOut(auth)} className="text-red-400 hover:text-red-300 flex items-center gap-2 text-sm border border-red-900/50 px-3 py-1 rounded bg-red-950/20">
        <LogOut className="w-4 h-4" /> DISCONNECT
      </button>
    </div>
  );
};

// --- CHATBOT COMPONENT ---
export const NeuroChat = () => {
  const [messages, setMessages] = useState<{role: string, text: string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'FAST' | 'THINK' | 'SEARCH'>('FAST');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      let responseText = '';

      if (mode === 'FAST') {
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-preview',
          contents: userMsg,
        });
        responseText = response.text || 'NO_RESPONSE';
      } else if (mode === 'THINK') {
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: userMsg,
          config: { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } }
        });
        responseText = response.text || 'NO_RESPONSE';
      } else if (mode === 'SEARCH') {
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: userMsg,
          config: { tools: [{ googleSearch: {} }] }
        });
        responseText = response.text || 'NO_RESPONSE';
        
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks && chunks.length > 0) {
          responseText += '\n\n**Sources:**\n';
          chunks.forEach((chunk: any) => {
            if (chunk.web?.uri) {
              responseText += `- [${chunk.web.title}](${chunk.web.uri})\n`;
            }
          });
        }
      }

      setMessages(prev => [...prev, { role: 'ai', text: responseText }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'ai', text: `[SYSTEM ERROR]: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] border border-emerald-900/50 bg-black/60 rounded-xl overflow-hidden">
      <div className="p-3 border-b border-emerald-900/50 flex gap-2 bg-emerald-950/20">
        <button onClick={() => setMode('FAST')} className={`px-3 py-1 text-xs rounded border ${mode === 'FAST' ? 'bg-emerald-900/80 border-emerald-400 text-emerald-200' : 'border-emerald-900 text-emerald-600 hover:bg-emerald-900/30'}`}>
          <Zap className="w-3 h-3 inline mr-1" /> FAST (LITE)
        </button>
        <button onClick={() => setMode('THINK')} className={`px-3 py-1 text-xs rounded border ${mode === 'THINK' ? 'bg-fuchsia-900/80 border-fuchsia-400 text-fuchsia-200' : 'border-emerald-900 text-emerald-600 hover:bg-emerald-900/30'}`}>
          <BrainCircuit className="w-3 h-3 inline mr-1" /> THINK (PRO)
        </button>
        <button onClick={() => setMode('SEARCH')} className={`px-3 py-1 text-xs rounded border ${mode === 'SEARCH' ? 'bg-blue-900/80 border-blue-400 text-blue-200' : 'border-emerald-900 text-emerald-600 hover:bg-emerald-900/30'}`}>
          <Search className="w-3 h-3 inline mr-1" /> SEARCH (GROUNDING)
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-emerald-700 mt-20">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>NEURO-CHAT INITIALIZED. AWAITING INPUT.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-emerald-900/40 border border-emerald-700 text-emerald-100' : 'bg-black/80 border border-emerald-900 text-emerald-400'}`}>
              {msg.role === 'ai' ? (
                <div className="markdown-body text-sm prose prose-invert prose-emerald max-w-none">
                  <Markdown>{msg.text}</Markdown>
                </div>
              ) : (
                <div className="text-sm">{msg.text}</div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-black/80 border border-emerald-900 text-emerald-500 p-3 rounded-lg flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> PROCESSING...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-3 border-t border-emerald-900/50 bg-black flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="ENTER QUERY..."
          className="flex-1 bg-emerald-950/20 border border-emerald-900 rounded px-3 py-2 text-emerald-400 focus:outline-none focus:border-emerald-500"
        />
        <button type="submit" disabled={loading || !input.trim()} className="bg-emerald-900/50 hover:bg-emerald-800 border border-emerald-500 text-emerald-300 px-4 py-2 rounded transition-all disabled:opacity-50">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

// --- MEDIA LAB COMPONENT ---
export const MediaLab = () => {
  const [activeTool, setActiveTool] = useState<'IMAGE_GEN' | 'VIDEO_GEN' | 'ANALYSIS' | 'TTS'>('IMAGE_GEN');
  
  // Image Gen State
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageModel, setImageModel] = useState<'gemini-3.1-flash-image-preview' | 'gemini-3-pro-image-preview'>('gemini-3.1-flash-image-preview');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageSize, setImageSize] = useState('1K');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  
  // Video Gen State
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoImage, setVideoImage] = useState<File | null>(null);
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  
  // Analysis State
  const [analysisFile, setAnalysisFile] = useState<File | null>(null);
  const [analysisPrompt, setAnalysisPrompt] = useState('Analyze this media in detail.');
  const [analysisResult, setAnalysisResult] = useState('');
  
  // TTS State
  const [ttsText, setTtsText] = useState('Welcome to the Neural Syndicate.');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleImageGen = async () => {
    if (!imagePrompt) return;
    setLoading(true);
    setError('');
    setGeneratedImage(null);

    try {
      // Check API key for Pro/Flash Image models
      if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
        await window.aistudio.openSelectKey();
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
      
      const config: any = {
        imageConfig: {
          aspectRatio: aspectRatio,
        }
      };
      
      if (imageModel === 'gemini-3-pro-image-preview') {
        config.imageConfig.imageSize = imageSize;
      }

      const response = await ai.models.generateContent({
        model: imageModel,
        contents: imagePrompt,
        config
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          setGeneratedImage(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
          break;
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoGen = async () => {
    if (!videoPrompt && !videoImage) return;
    setLoading(true);
    setError('');
    setGeneratedVideo(null);

    try {
      if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
        await window.aistudio.openSelectKey();
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
      
      const req: any = {
        model: 'veo-3.1-fast-generate-preview',
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: videoAspectRatio
        }
      };

      if (videoPrompt) req.prompt = videoPrompt;
      
      if (videoImage) {
        const base64 = await fileToBase64(videoImage);
        req.image = {
          imageBytes: base64,
          mimeType: videoImage.type
        };
      }

      let operation = await ai.models.generateVideos(req);

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({operation: operation});
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const response = await fetch(downloadLink, {
          method: 'GET',
          headers: { 'x-goog-api-key': process.env.API_KEY || process.env.GEMINI_API_KEY || '' },
        });
        const blob = await response.blob();
        setGeneratedVideo(URL.createObjectURL(blob));
      } else {
        setError("Failed to generate video.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalysis = async () => {
    if (!analysisFile) return;
    setLoading(true);
    setError('');
    setAnalysisResult('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const base64 = await fileToBase64(analysisFile);
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: [
          { inlineData: { data: base64, mimeType: analysisFile.type } },
          analysisPrompt
        ]
      });
      
      setAnalysisResult(response.text || 'No analysis result.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTTS = async () => {
    if (!ttsText) return;
    setLoading(true);
    setError('');
    setAudioUrl(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: ttsText,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        setAudioUrl(`data:audio/wav;base64,${base64Audio}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-emerald-900/50 bg-black/60 rounded-xl overflow-hidden">
      <div className="flex border-b border-emerald-900/50 bg-emerald-950/20">
        <button onClick={() => setActiveTool('IMAGE_GEN')} className={`flex-1 p-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTool === 'IMAGE_GEN' ? 'bg-emerald-900/50 text-emerald-300 border-b-2 border-emerald-400' : 'text-emerald-700 hover:bg-emerald-900/20'}`}>
          <ImageIcon className="w-4 h-4" /> IMAGE
        </button>
        <button onClick={() => setActiveTool('VIDEO_GEN')} className={`flex-1 p-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTool === 'VIDEO_GEN' ? 'bg-emerald-900/50 text-emerald-300 border-b-2 border-emerald-400' : 'text-emerald-700 hover:bg-emerald-900/20'}`}>
          <Video className="w-4 h-4" /> VIDEO
        </button>
        <button onClick={() => setActiveTool('ANALYSIS')} className={`flex-1 p-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTool === 'ANALYSIS' ? 'bg-emerald-900/50 text-emerald-300 border-b-2 border-emerald-400' : 'text-emerald-700 hover:bg-emerald-900/20'}`}>
          <Search className="w-4 h-4" /> ANALYZE
        </button>
        <button onClick={() => setActiveTool('TTS')} className={`flex-1 p-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTool === 'TTS' ? 'bg-emerald-900/50 text-emerald-300 border-b-2 border-emerald-400' : 'text-emerald-700 hover:bg-emerald-900/20'}`}>
          <Mic className="w-4 h-4" /> TTS
        </button>
      </div>

      <div className="p-6">
        {error && <div className="mb-4 p-3 bg-red-950/50 border border-red-900 text-red-400 rounded text-sm">{error}</div>}

        {activeTool === 'IMAGE_GEN' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-emerald-600 mb-1">MODEL</label>
              <select value={imageModel} onChange={(e: any) => setImageModel(e.target.value)} className="w-full bg-black border border-emerald-900 rounded p-2 text-emerald-400">
                <option value="gemini-3.1-flash-image-preview">Nano Banana 2 (Flash)</option>
                <option value="gemini-3-pro-image-preview">Nano Banana Pro (Pro)</option>
              </select>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs text-emerald-600 mb-1">ASPECT RATIO</label>
                <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="w-full bg-black border border-emerald-900 rounded p-2 text-emerald-400">
                  <option value="1:1">1:1</option>
                  <option value="16:9">16:9</option>
                  <option value="9:16">9:16</option>
                  <option value="4:3">4:3</option>
                  <option value="3:4">3:4</option>
                  <option value="3:2">3:2</option>
                  <option value="2:3">2:3</option>
                  <option value="21:9">21:9</option>
                </select>
              </div>
              {imageModel === 'gemini-3-pro-image-preview' && (
                <div className="flex-1">
                  <label className="block text-xs text-emerald-600 mb-1">SIZE</label>
                  <select value={imageSize} onChange={(e) => setImageSize(e.target.value)} className="w-full bg-black border border-emerald-900 rounded p-2 text-emerald-400">
                    <option value="1K">1K</option>
                    <option value="2K">2K</option>
                    <option value="4K">4K</option>
                  </select>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs text-emerald-600 mb-1">PROMPT</label>
              <textarea value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} className="w-full bg-black border border-emerald-900 rounded p-2 text-emerald-400 h-24" placeholder="Describe the image..."></textarea>
            </div>
            <button onClick={handleImageGen} disabled={loading || !imagePrompt} className="w-full bg-emerald-900/50 hover:bg-emerald-800 border border-emerald-500 text-emerald-300 py-2 rounded font-bold disabled:opacity-50 flex justify-center items-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} GENERATE IMAGE
            </button>
            {generatedImage && (
              <div className="mt-4 border border-emerald-900 p-2 rounded bg-black">
                <img src={generatedImage} alt="Generated" className="w-full h-auto rounded" />
              </div>
            )}
          </div>
        )}

        {activeTool === 'VIDEO_GEN' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-emerald-600 mb-1">ASPECT RATIO</label>
              <select value={videoAspectRatio} onChange={(e: any) => setVideoAspectRatio(e.target.value)} className="w-full bg-black border border-emerald-900 rounded p-2 text-emerald-400">
                <option value="16:9">16:9 (Landscape)</option>
                <option value="9:16">9:16 (Portrait)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-emerald-600 mb-1">STARTING IMAGE (OPTIONAL)</label>
              <input type="file" accept="image/*" onChange={(e) => setVideoImage(e.target.files?.[0] || null)} className="w-full bg-black border border-emerald-900 rounded p-2 text-emerald-400 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-emerald-600 mb-1">PROMPT</label>
              <textarea value={videoPrompt} onChange={(e) => setVideoPrompt(e.target.value)} className="w-full bg-black border border-emerald-900 rounded p-2 text-emerald-400 h-24" placeholder="Describe the video motion..."></textarea>
            </div>
            <button onClick={handleVideoGen} disabled={loading || (!videoPrompt && !videoImage)} className="w-full bg-emerald-900/50 hover:bg-emerald-800 border border-emerald-500 text-emerald-300 py-2 rounded font-bold disabled:opacity-50 flex justify-center items-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />} GENERATE VIDEO (VEO 3)
            </button>
            {loading && <p className="text-xs text-emerald-600 text-center mt-2">Video generation may take a few minutes. Please wait.</p>}
            {generatedVideo && (
              <div className="mt-4 border border-emerald-900 p-2 rounded bg-black">
                <video src={generatedVideo} controls autoPlay loop className="w-full h-auto rounded" />
              </div>
            )}
          </div>
        )}

        {activeTool === 'ANALYSIS' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-emerald-600 mb-1">UPLOAD MEDIA (IMAGE/VIDEO)</label>
              <input type="file" accept="image/*,video/*" onChange={(e) => setAnalysisFile(e.target.files?.[0] || null)} className="w-full bg-black border border-emerald-900 rounded p-2 text-emerald-400 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-emerald-600 mb-1">PROMPT</label>
              <textarea value={analysisPrompt} onChange={(e) => setAnalysisPrompt(e.target.value)} className="w-full bg-black border border-emerald-900 rounded p-2 text-emerald-400 h-24"></textarea>
            </div>
            <button onClick={handleAnalysis} disabled={loading || !analysisFile} className="w-full bg-emerald-900/50 hover:bg-emerald-800 border border-emerald-500 text-emerald-300 py-2 rounded font-bold disabled:opacity-50 flex justify-center items-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} ANALYZE MEDIA
            </button>
            {analysisResult && (
              <div className="mt-4 border border-emerald-900 p-4 rounded bg-black/80 text-emerald-400 text-sm markdown-body prose prose-invert prose-emerald max-w-none">
                <Markdown>{analysisResult}</Markdown>
              </div>
            )}
          </div>
        )}

        {activeTool === 'TTS' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-emerald-600 mb-1">TEXT TO SPEECH</label>
              <textarea value={ttsText} onChange={(e) => setTtsText(e.target.value)} className="w-full bg-black border border-emerald-900 rounded p-2 text-emerald-400 h-24"></textarea>
            </div>
            <button onClick={handleTTS} disabled={loading || !ttsText} className="w-full bg-emerald-900/50 hover:bg-emerald-800 border border-emerald-500 text-emerald-300 py-2 rounded font-bold disabled:opacity-50 flex justify-center items-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />} SYNTHESIZE AUDIO
            </button>
            {audioUrl && (
              <div className="mt-4 border border-emerald-900 p-4 rounded bg-black flex justify-center">
                <audio src={audioUrl} controls autoPlay className="w-full" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
