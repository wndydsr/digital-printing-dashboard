"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Smile, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ───────────────────────────────────────────────────────────────────
type Sender = "desainer" | "customer";

interface Message {
  id: number;
  sender: Sender;
  name: string;
  time: string;
  text?: string;
  image?: string;
  isDesainSubmission?: boolean;
}

// ─── Static Data ─────────────────────────────────────────────────────────────
const DESAINER = { name: "Guy Hawkins", initials: "GH", role: "Desainer" };
const CUSTOMER = { name: "Windy Destiana", initials: "WD" };

export default function DiskusiDesainPolesan() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: "customer",
      name: CUSTOMER.name,
      time: "10:15 AM",
      text: "Halo, saya sudah upload logo dan referensi desain yang ingin saya gunakan. Terima kasih.",
    },
    {
      id: 2,
      sender: "desainer",
      name: DESAINER.name,
      time: "10:20 PM",
      text: "Baik kak, siap. Saya akan mulai proses desainnya.",
    },
    {
      id: 3,
      sender: "desainer",
      name: DESAINER.name,
      time: "02:45 PM",
      image: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500&q=80",
      text: "Ini adalah hasil desain awalnya, mohon dicek ya kak 😄",
      isDesainSubmission: true,
    },
  ]);

  const [inputText, setInputText] = useState("");
  const [showRevisi, setShowRevisi] = useState(false);
  const [revisiNote, setRevisiNote] = useState("");
  const [approvedId, setApprovedId] = useState<number | null>(null);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    const newMsg: Message = {
      id: Date.now(),
      sender: "customer", // Biasanya customer yang balas di sini
      name: CUSTOMER.name,
      time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      text: inputText,
    };
    setMessages([...messages, newMsg]);
    setInputText("");
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
      {/* TOPBAR */}
      <header className="flex items-center justify-between px-6 py-3 bg-white border-bottom border-slate-200 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl">
            <ArrowLeft className="h-4 w-4 text-slate-600" />
          </Button>
          <div className="flex items-baseline gap-2">
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">Diskusi Desain –</h1>
            <Badge variant="secondary" className="font-mono text-indigo-600 bg-indigo-50 hover:bg-indigo-50 border-none px-2 py-0.5">
              ORD-02131
            </Badge>
          </div>
        </div>
        <Button variant="ghost" className="text-indigo-600 font-semibold hover:bg-indigo-50">
          Detail Pesanan
        </Button>
      </header>

      {/* MAIN LAYOUT */}
      <main className="flex flex-1 overflow-hidden">
        {/* CHAT PANEL */}
        <section className="flex-1 flex flex-col bg-[#F8FAFC]">
          <ScrollArea className="flex-1 px-6 py-6">
            <div className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6">
              17 April 2023
            </div>

            <div className="space-y-6">
              {messages.map((msg) => {
                const isDesainer = msg.sender === "desainer";
                return (
                  <div key={msg.id} className={`flex gap-3 ${isDesainer ? "flex-row-reverse" : "flex-row"}`}>
                    <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                      <AvatarFallback className={isDesainer ? "bg-indigo-600 text-white" : "bg-sky-500 text-white"}>
                        {isDesainer ? "GH" : "WD"}
                      </AvatarFallback>
                    </Avatar>

                    <div className={`flex flex-col max-w-[70%] ${isDesainer ? "items-end" : "items-start"}`}>
                      <div className={`flex items-baseline gap-2 mb-1 ${isDesainer ? "flex-row-reverse" : "flex-row"}`}>
                        <span className="text-xs font-bold text-slate-700">{msg.name}</span>
                        {isDesainer && <span className="text-[10px] font-medium text-slate-400">(Desainer)</span>}
                        <span className="text-[10px] text-slate-400">{msg.time}</span>
                      </div>

                      {msg.isDesainSubmission ? (
                        <Card className="overflow-hidden border-slate-200 shadow-md max-w-[340px] rounded-2xl rounded-tl-sm">
                          <img src={msg.image} alt="Desain" className="w-full h-48 object-cover border-b border-slate-100" />
                          <CardContent className="p-4">
                            <p className="text-sm text-slate-600 leading-relaxed mb-4">{msg.text}</p>
                            {approvedId === msg.id ? (
                              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none py-1.5 px-4 rounded-full flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4" />
                                Desain Disetujui
                              </Badge>
                            ) : (
                              <div className="flex gap-2">
                                <Button variant="outline" className="flex-1 text-red-500 border-red-200 hover:bg-red-50 font-bold text-xs h-9 rounded-xl" onClick={() => setShowRevisi(true)}>
                                  Minta Revisi
                                </Button>
                                <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600 font-bold text-xs h-9 rounded-xl" onClick={() => setApprovedId(msg.id)}>
                                  Setujui Desain
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ) : (
                        <div className={`px-4 py-3 text-[13.5px] leading-relaxed shadow-sm
                          ${isDesainer 
                            ? "bg-indigo-50 text-indigo-900 border border-indigo-100 rounded-2xl rounded-tr-sm" 
                            : "bg-white text-slate-700 border border-slate-200 rounded-2xl rounded-tl-sm"
                          }`}>
                          {msg.text}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          {/* INPUT BAR */}
          <footer className="p-4 bg-white border-t border-slate-200">
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2 bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-1.5 focus-within:border-indigo-400 focus-within:bg-white transition-all">
                <Input 
                  placeholder="Tulis pesan..." 
                  className="border-none bg-transparent focus-visible:ring-0 text-sm shadow-none p-0 h-10"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                />
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-indigo-600 h-8 w-8" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-indigo-600 h-8 w-8">
                  <Smile className="h-5 w-5" />
                </Button>
              </div>
              <Button className="bg-indigo-600 hover:bg-indigo-700 px-6 rounded-xl font-bold transition-all active:scale-95" onClick={handleSend}>
                Kirim
              </Button>
              <input ref={fileInputRef} type="file" className="hidden" />
            </div>
          </footer>
        </section>

        {/* SIDEBAR */}
        <aside className="w-[300px] bg-white border-l border-slate-200 p-5 overflow-y-auto hidden lg:flex flex-col gap-8">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-4">Info Pesanan</h3>
            <div className="flex gap-3 p-3 rounded-2xl border border-slate-100 bg-slate-50/50">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] text-white font-black text-center leading-tight">
                SOUND<br/>FEST
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-slate-800">Banner</span>
                <span className="text-[11px] text-slate-500 font-medium">2 x 1 meter · 2 pcs</span>
                <Badge className="w-fit mt-1 bg-amber-100 text-amber-700 hover:bg-amber-100 border-none text-[10px] font-bold">
                  Dikerjakan
                </Badge>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-4">Riwayat File Desain</h3>
            <Button variant="outline" className="w-full border-dashed border-indigo-200 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 mb-4 rounded-xl py-5 border-2">
              Upload File Desain
            </Button>
            {/* File List Item */}
            <div className="flex items-center gap-3 p-2.5 rounded-xl border border-transparent hover:border-indigo-100 hover:bg-indigo-50/30 transition-all cursor-pointer group">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-700 truncate group-hover:text-indigo-600">desain-awal-v1.jpg</span>
                <span className="text-[10px] text-slate-400">17 Apr 2023 · 02:45 PM</span>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* MODAL REVISI (SHADCN DIALOG) */}
      <Dialog open={showRevisi} onOpenChange={setShowRevisi}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800">Minta Revisi</DialogTitle>
            <DialogDescription className="text-slate-500">
              Jelaskan detail perubahan yang kamu inginkan pada desain ini.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea 
              placeholder="Contoh: Tolong ganti fontnya jadi lebih tebal dan logo ditaruh tengah..."
              className="min-h-[120px] rounded-2xl border-slate-200 focus:ring-indigo-500"
              value={revisiNote}
              onChange={(e) => setRevisiNote(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setShowRevisi(false)} className="rounded-xl font-bold">Batal</Button>
            <Button className="bg-red-500 hover:bg-red-600 rounded-xl font-bold px-6" onClick={() => setShowRevisi(false)}>Kirim Revisi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}