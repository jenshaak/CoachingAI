"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle2, Circle, HelpCircle, Loader2, ExternalLink, Download, FileText } from 'lucide-react'; // Icons for status and Loader2

// Define questions with keys, matching the backend order
const hybridOfferQuestions = [
  { key: 'offerDescription', question: "Tell us about the offer high level" },
  { key: 'targetAudience', question: "Who is your target audience?" },
  { key: 'painPoints', question: "What are their main pain points?" },
  { key: 'solution', question: "What is the unique way you solve this problem?" },
  { key: 'pricing', question: "What is your pricing structure?" },
  { key: 'clientResult', question: "Finally, what's your biggest client result?" }
];

export default function ChatArea({ selectedTool, currentChat, setCurrentChat, chats, setChats }) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [collectedAnswers, setCollectedAnswers] = useState({});
  const [currentQuestionKey, setCurrentQuestionKey] = useState(null);
  const [isInitiating, setIsInitiating] = useState(false);
  const [initiationAttemptedForContext, setInitiationAttemptedForContext] = useState(false);
  const [isWaitingForN8n, setIsWaitingForN8n] = useState(false);
  const eventSourceRef = useRef(null);
  const textareaRef = useRef(null);
  const scrollAreaRef = useRef(null);

  // Reset state when chat or tool changes
  useEffect(() => {
    console.log(`[Context Change Effect] Running. ChatID: ${currentChat?.id}, Tool: ${selectedTool}`);
    setCollectedAnswers({});
    setInitiationAttemptedForContext(false);
    setIsWaitingForN8n(false);
    if (eventSourceRef.current) {
        console.log("[Context Change Effect] Closing existing EventSource.");
        eventSourceRef.current.close();
        eventSourceRef.current = null;
    }
    const firstKey = hybridOfferQuestions[0]?.key || null;
    setCurrentQuestionKey(selectedTool === 'hybrid-offer' ? firstKey : null);
  }, [currentChat?.id, selectedTool]);

  // Update starting key if chat history already exists for hybrid-offer
  useEffect(() => {
      if (selectedTool === 'hybrid-offer' && currentChat?.messages?.length > 0) {
          // A more robust way would be to persist/load answers+key with the chat 
          // For now, just don't reset to first key if history exists
          if (!currentQuestionKey) {
              setCurrentQuestionKey(hybridOfferQuestions[0].key); // Default if somehow null
          }
      } else if (selectedTool === 'hybrid-offer') {
          setCurrentQuestionKey(hybridOfferQuestions[0].key);
      }
  }, [currentChat?.id, currentChat?.messages?.length, selectedTool]); // Re-run if chat loads

  // Effect to initiate chat for Hybrid Offer tool
  useEffect(() => {
    console.log(
        `[Initiation Check Effect] Tool=${selectedTool}, ChatID=${currentChat?.id}, ` +
        `MsgCount=${currentChat?.messages?.length}, Attempted=${initiationAttemptedForContext}, ` +
        `Initiating=${isInitiating}, Loading=${isLoading}`
    );
    if (
        selectedTool === 'hybrid-offer' &&
        !initiationAttemptedForContext && 
        !isInitiating &&
        !isLoading &&
        (!currentChat || currentChat.messages.length === 0)
       ) {
      console.log(`[Initiation Check] Conditions met. Attempting initiation...`);
      setInitiationAttemptedForContext(true); 
      setIsInitiating(true);
      const chatIdToUse = currentChat?.id || Date.now().toString() + "-temp";
      if (!currentChat) {
          console.warn(`[Initiation Check] currentChat is null/undefined. Using temporary ID: ${chatIdToUse}.`);
      }
      initiateHybridOfferChat(chatIdToUse); 
    }
  }, [
    selectedTool,
    currentChat,
    currentChat?.messages?.length,
    initiationAttemptedForContext,
    isInitiating,
    isLoading,
  ]);

  // Function to call the API for the first message
  const initiateHybridOfferChat = async (chatIdToInitiate) => {
      console.log(`[Initiate Func] Starting for chat ID: ${chatIdToInitiate}`);
      setIsLoading(true);
      setCollectedAnswers({}); 
      // We let the backend determine the first question key based on empty messages
      // setCurrentQuestionKey(hybridOfferQuestions[0].key); // No longer needed here

      try {
          console.log(`[Initiate Func] Calling fetch for initial message...`);
          const response = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  messages: [],
                  currentTool: 'hybrid-offer',
                  collectedAnswers: {},
                  currentQuestionKey: null,
                  chatId: chatIdToInitiate
              }),
          });

          console.log(`[Initiate Func] Fetch response status: ${response.status}`);
          if (!response.ok) {
              const errorText = await response.text(); 
              throw new Error(`API failed (${response.status}): ${errorText}`);
          }
          const data = await response.json();
          console.log("[Initiate Func] API response data:", data);
          const assistantMessage = data.message;
          const returnedAnswers = data.collectedAnswers;
          const nextQuestionKey = data.currentQuestionKey;
          if (!assistantMessage || !nextQuestionKey) {
               throw new Error("API response missing assistant message or next question key during initiation.");
          }
          setCollectedAnswers(returnedAnswers || {});
          setCurrentQuestionKey(nextQuestionKey);
          const updatedChat = {
              id: chatIdToInitiate,
              title: "Hybrid Offer Chat",
              messages: [assistantMessage] 
          };
          console.log("[Initiate Func] Constructed updatedChat:", updatedChat);
          console.log("[Initiate Func] Updating chats list and setting current chat...");
          setChats(prev => {
              const chatIndex = prev.findIndex(c => c.id === chatIdToInitiate);
              if (chatIndex > -1) {
                   const newList = [...prev];
                   newList[chatIndex] = updatedChat;
                   return newList;
              } else {
                  console.warn(`[Initiate Func] Chat ID ${chatIdToInitiate} not found in list, adding newly.`);
                  return [updatedChat, ...prev];
              }
          });
          setCurrentChat(updatedChat);
          console.log(`[Initiate Func] Finished setting current chat ID: ${updatedChat.id}`);

      } catch (error) {
          console.error('[Initiate Func] Error initiating chat:', error);
          const errorAssistantMessage = { role: "assistant", content: `Sorry, I couldn't start the session: ${error.message}` };
          const errorChat = { id: chatIdToInitiate, title: "Initiation Error", messages: [errorAssistantMessage] };
          setChats(prev => { 
               const chatIndex = prev.findIndex(c => c.id === chatIdToInitiate);
               if(chatIndex > -1) { 
                   const newList = [...prev];
                   newList[chatIndex] = errorChat;
                   return newList;
               } else return [errorChat, ...prev];
           });
           setCurrentChat(errorChat);
      } finally {
          console.log("[Initiate Func] Finalizing initiation attempt.");
          setIsLoading(false);
          setIsInitiating(false); 
          textareaRef.current?.focus();
      }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const trimmedInput = input.trim();

    // Add a check here for currentChat right at the start
    if (!currentChat) {
        console.error("handleSubmit aborted: currentChat is null or undefined.");
        alert("Cannot send message: No active chat selected."); // User feedback
        return;
    }
    // Also prevent submission if loading/initiating
    if (!trimmedInput || isLoading || isInitiating) return;

    const newMessage = { role: "user", content: trimmedInput };
    setInput("");

    let chatToUpdate = currentChat; // Use the guaranteed currentChat

    const updatedMessages = [...chatToUpdate.messages, newMessage];
    const optimisticChat = { ...chatToUpdate, messages: updatedMessages };

    setChats(prev => prev.map(chat => chat.id === chatToUpdate.id ? optimisticChat : chat));
    setCurrentChat(optimisticChat);
    setIsLoading(true);

    try {
       const response = await fetch('/api/chat', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
               messages: updatedMessages,
               currentTool: selectedTool,
               collectedAnswers: collectedAnswers,
               currentQuestionKey: currentQuestionKey,
               chatId: chatToUpdate.id
           }),
       });
        if (!response.ok) {
           const errorData = await response.json().catch(() => ({ error: "Request failed with status: " + response.status }));
           throw new Error(errorData.details || errorData.error || 'API request failed');
        }
        const data = await response.json();
        const assistantMessage = data.message;
        const returnedAnswers = data.collectedAnswers;
        const nextQuestionKey = data.currentQuestionKey;
        const isComplete = data.isComplete;
        const chatId = data.chatId;

        setCollectedAnswers(returnedAnswers || {});
        setCurrentQuestionKey(nextQuestionKey);

        const finalChat = { ...optimisticChat, messages: [...updatedMessages, assistantMessage] };
        setChats(prev => prev.map(chat => chat.id === finalChat.id ? finalChat : chat));
        setCurrentChat(finalChat);

        if (isComplete && chatId) {
            console.log(`[handleSubmit] Offer complete for chatId: ${chatId}. Initiating SSE connection.`);
            setIsWaitingForN8n(true);
            const encodedAnswers = encodeURIComponent(JSON.stringify(returnedAnswers || {}));
            connectToN8nResultStream(chatId, encodedAnswers);
        }

    } catch (error) {
        console.error('Error:', error);
        const errorAssistantMessage = { role: "assistant", content: `Sorry, an error occurred: ${error.message}` };
        const errorChat = { ...optimisticChat, messages: [...updatedMessages, errorAssistantMessage] };
        setChats(prev => prev.map(chat => chat.id === errorChat.id ? errorChat : chat));
        setCurrentChat(errorChat);
    } finally {
      setIsLoading(false);
      if (!isWaitingForN8n) {
         textareaRef.current?.focus();
      } 
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-scroll
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[style*="overflow: hidden scroll"]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [currentChat?.messages]);

  // Determine if the offer creation process is complete for UI feedback
  const isOfferComplete = currentQuestionKey === null && Object.keys(collectedAnswers).length > 0;

  // Function to connect to SSE endpoint
  const connectToN8nResultStream = (chatId, encodedAnswers) => {
    if (eventSourceRef.current) {
      console.log("[SSE Connect] Closing existing EventSource before creating new one.");
      eventSourceRef.current.close(); // Close any previous connection
    }

    console.log(`[SSE Connect] Connecting to /api/n8n-result?chatId=${chatId}&answersData=${encodedAnswers}`);
    const es = new EventSource(`/api/n8n-result?chatId=${chatId}&answersData=${encodedAnswers}`);
    eventSourceRef.current = es; // Store the reference

    es.onopen = () => {
      console.log("[SSE Connect] EventSource connection opened.");
    };

    // Listen for the specific event from the backend
    es.addEventListener('n8n_result', (event) => {
      console.log("[SSE Connect] Received n8n_result event:", event.data);
      let resultMessageContent = null; // Initialize as null

      try {
        const eventData = JSON.parse(event.data);
        if (eventData.success && eventData.data) {
          // --- Construct JSX message content ---
          const n8nResult = eventData.data;
          resultMessageContent = (
            <div className="space-y-3"> {/* Added spacing */}
              <div className="flex items-center gap-2 font-medium"> {/* Success message style */}
                 <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                 <span>Document generated successfully!</span>
              </div>
              <div className="flex flex-wrap gap-2"> {/* Use flex-wrap for buttons */}
                 {n8nResult.pdfWebViewLink && (
                   <Button variant="outline" size="sm" asChild>
                      <a href={n8nResult.pdfWebViewLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" /> View PDF
                      </a>
                   </Button>
                 )}
                 {n8nResult.pdfDownlaodLink && ( // Typo corrected from original request
                   <Button variant="outline" size="sm" asChild>
                      <a href={n8nResult.pdfDownlaodLink} target="_blank" rel="noopener noreferrer" download> {/* Added download attribute */}
                         <Download className="mr-2 h-4 w-4" /> Download PDF
                      </a>
                   </Button>
                 )}
                 {n8nResult.googleDocLink && ( // Updated key name
                    <Button variant="outline" size="sm" asChild>
                       <a href={n8nResult.googleDocLink} target="_blank" rel="noopener noreferrer">
                           <FileText className="mr-2 h-4 w-4" /> View Google Doc
                       </a>
                    </Button>
                  )}
              </div>
            </div>
          );
          // --- End JSX construction ---
        } else {
           throw new Error(eventData.message || 'Received unsuccessful result from server.');
        }
      } catch (parseError) {
        console.error("[SSE Connect] Error parsing n8n_result data or constructing message:", parseError);
        // Fallback text message on error
        resultMessageContent = "✅ Document generated, but there was an issue displaying the links.";
      }

      // Add the message (JSX or fallback text) to the chat state
      if (resultMessageContent !== null && currentChat?.id === chatId) { // Ensure chat context is still correct
          const resultMessage = { role: 'assistant', content: resultMessageContent, isJSX: true }; // Add isJSX flag
          setCurrentChat(prevChat => {
              if (!prevChat || prevChat.id !== chatId) return prevChat; // Safety check
              return {...prevChat, messages: [...prevChat.messages, resultMessage]};
          });
          setChats(prevChats => prevChats.map(c => {
              if (c.id === chatId) {
                  return {...c, messages: [...c.messages, resultMessage]};
              }
              return c;
          }));
      } else {
          console.warn("[SSE Connect] Could not add result message - chat context might have changed or content was null.");
      }

      setIsWaitingForN8n(false);
      es.close();
      eventSourceRef.current = null;
      console.log("[SSE Connect] Closed connection after n8n_result.");
      textareaRef.current?.focus();
    });

    // Handle generic errors
    es.onerror = (error) => {
      console.error("[SSE Connect] EventSource error:", error);
      setIsWaitingForN8n(false);
      // Add an error message (text) to the chat
      const sseErrorMessage = { role: 'assistant', content: "Connection error while generating document. Please try again later.", isJSX: false }; // Mark as not JSX
       if (currentChat?.id === chatId) { // Add error only if chat context is still relevant
            setCurrentChat(prevChat => prevChat ? {...prevChat, messages: [...prevChat.messages, sseErrorMessage]} : null);
            setChats(prevChats => prevChats.map(c => c.id === chatId ? {...c, messages: [...c.messages, sseErrorMessage]} : c));
       }
      es.close();
      eventSourceRef.current = null;
    };
  };

  return (
    <div className="flex-1 flex flex-col h-full relative"> {/* Added relative positioning */}
       {/* --- Status Display --- */}
       {selectedTool === 'hybrid-offer' && (
           <div className="absolute top-4 right-4 bg-background border rounded-lg p-3 shadow-md max-w-[200px] z-10">
                <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Offer Status</h4>
                <ul className="space-y-1">
                    {hybridOfferQuestions.map(q => (
                        <li key={q.key} className="flex items-center gap-2 text-xs">
                            {collectedAnswers[q.key] ? (
                                <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                            ) : currentQuestionKey === q.key ? (
                                <HelpCircle className="h-3 w-3 text-blue-500 flex-shrink-0 animate-pulse" />
                            ) : (
                                <Circle className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
                            )}
                            <span className={`${currentQuestionKey === q.key ? 'font-medium' : 'text-muted-foreground'} truncate`} title={q.question}>
                                {q.question.split(' ').slice(0, 4).join(' ')}...
                            </span>
                        </li>
                    ))}
                </ul>
           </div>
       )}
       {/* --- End Status Display --- */}

      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 pt-16"> {/* Reduced padding-top */}
          {/* Initial Welcome Message (simplified) */}  
          {!currentChat?.messages?.length && selectedTool === "hybrid-offer" && (
              <div className="text-center space-y-2 p-4 bg-muted rounded-lg">
              <h2 className="text-xl font-semibold">Welcome to Hybrid Offer Creator</h2>
              <p className="text-muted-foreground text-sm">
                  Let's gather the details for your offer. I'll ask a few questions.
              </p>
              </div>
          )}
          {!currentChat?.messages?.length && selectedTool !== "hybrid-offer" && (
              <div className="text-center space-y-2 p-4">
                  <h2 className="text-xl font-semibold">Start Chatting</h2>
              </div>
          )} 
          
          {/* Chat Messages */}  
          {currentChat?.messages?.map((message, i) => (
              <div
              key={`${currentChat.id}-${i}`}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
              {message.role === "assistant" && (
                  <Avatar className="flex-shrink-0">
                  <AvatarImage src="/bot-avatar.png" alt="AI" />
                  </Avatar>
              )}
              <div
                  className={`rounded-lg p-3 max-w-[80%] text-sm ${ // Removed whitespace-pre-wrap IF content is JSX
                  message.role === "user"
                      ? "bg-primary text-primary-foreground whitespace-pre-wrap" // Keep for user text
                      : "bg-muted"
                  } ${!message.isJSX ? 'whitespace-pre-wrap' : ''}`} // Apply only if not JSX
              >
                  {/* Render content directly - React handles JSX vs strings */}
                  {message.content}
              </div>
              {message.role === "user" && (
                  <Avatar className="flex-shrink-0">
                  <AvatarImage src="/user-avatar.png" alt="User" />
                  </Avatar>
              )}
              </div>
          ))}
          {/* N8N Loading Indicator */} 
          {isWaitingForN8n && (
             <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg">
                 <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                 <span className="text-sm text-muted-foreground">Generating document... (approx. 1 min)</span>
             </div>
          )}
      </ScrollArea>

      {/* Input Form */}  
      <form onSubmit={handleSubmit} className="p-4 border-t bg-background">
        <div className="max-w-2xl mx-auto flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isOfferComplete ? "Offer data sent." : isWaitingForN8n ? "Generating document..." : isLoading ? "Waiting..." : "Type your message..."}
            className="min-h-[40px] max-h-[200px] resize-none text-sm flex-1"
            rows={1}
            disabled={isLoading || isInitiating || isOfferComplete || isWaitingForN8n} // Disable while waiting for n8n
          />
          <Button 
             type="submit" 
             disabled={isLoading || isInitiating || !input.trim() || isOfferComplete || isWaitingForN8n}
             size="sm"
          >
            {isLoading || isInitiating || isWaitingForN8n ? "..." : "Send"}
          </Button>
        </div>
      </form>
    </div>
  );
} 