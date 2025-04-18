"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/components/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogIn, LogOut } from 'lucide-react';

export default function Sidebar({ selectedTool, setSelectedTool, chats, currentChat, setCurrentChat }) {
  const { user, signInWithGoogle, signOut } = useAuth();

  const tools = [
    {
      id: "hybrid-offer",
      name: "Hybrid Offer Creator",
      description: "Create personalized hybrid offers"
    }
  ];

  const handleNewChat = () => {
    const newChat = {
      id: Date.now().toString(),
      title: "New conversation",
      messages: []
    };
    setCurrentChat(newChat);
  };

  return (
    <div className="w-[300px] h-full border-r flex flex-col bg-background">
      <div className="flex-grow flex flex-col">
        <div className="p-4 border-b">
          <Button className="w-full" variant="outline" onClick={handleNewChat}>
            New Chat
          </Button>
        </div>
        
        <div className="p-4 border-b">
          <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">
            Specialized Tools
          </h2>
          <div className="space-y-1">
            {tools.map((tool) => (
              <Button
                key={tool.id}
                variant={selectedTool === tool.id ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setSelectedTool(tool.id)}
              >
                {tool.name}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex-1 p-4 overflow-hidden">
          <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">
            Past Conversations
          </h2>
          <ScrollArea className="h-[calc(100% - 40px)]">
            <div className="space-y-1 pr-2">
              {chats.map((chat) => (
                <Button
                  key={chat.id}
                  variant={currentChat?.id === chat.id ? "secondary" : "ghost"}
                  className="w-full justify-start truncate"
                  onClick={() => setCurrentChat(chat)}
                  title={chat.title || "New conversation"}
                >
                  {chat.title || "New conversation"}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      <div className="p-4 border-t mt-auto">
        {user ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email} />
                <AvatarFallback>{user.email?.[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium truncate" title={user.email}>
                {user.email}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} title="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button className="w-full" onClick={signInWithGoogle}>
            <LogIn className="mr-2 h-4 w-4" /> Login with Google
          </Button>
        )}
      </div>
    </div>
  );
} 