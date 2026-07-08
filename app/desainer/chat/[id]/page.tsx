"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Smile, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
// 🌟 INTEGRASI useSearchParams untuk menangkap query parameter (?item=) tanpa mengubah folder routing
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { initEcho } from "@/lib/echo";

type Sender = "desainer" | "customer";

interface Message {
  id: number;
  sender: Sender;
  message?: string;
  file?: string;
  is_design?: boolean | number | string;
  created_at: string;
}

interface OrderInfo {
  order_code: string;
  product_name: string;
  product_thumbnail_label: string; 
  size: string;
  qty: number;
  status: "dikerjakan" | "siap_cetak" | "selesai" | "revisi" | "menunggu";
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  dikerjakan: { label: "Dikerjakan", className: "bg-amber-100 text-amber-700 border-none" },
  siap_cetak: { label: "Siap Cetak", className: "bg-emerald-100 text-emerald-700 border-none" },
  selesai: { label: "Selesai", className: "bg-indigo-100 text-indigo-700 border-none" },
  revisi: { label: "Revisi", className: "bg-rose-100 text-red-700 border-none" },
  menunggu: { label: "Menunggu", className: "bg-slate-100 text-slate-700 border-none" },
};

const formatDateHeader = (dateStr: string) => {
  return new Date(dateStr)
    .toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
    .toUpperCase();
};

export default function DiskusiDesainPolesan() {
  const params = useParams();
  const router = useRouter();
  
  // 🌟 AKTIFKAN useSearchParams UNTUK MENYARING DISKUSI PER ITEM PRODUK
  const searchParams = useSearchParams();
  const itemId = searchParams.get("item"); 

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // State bantuan untuk memegang preview blob lokal pas gambar di-upload desainer
  const [uploadingBlob, setUploadingBlob] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const ASSET_URL = API_URL ? API_URL.replace(/\/api$/, "").replace(/\/api\/$/, "") : "";
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    initEcho();
    if (!params?.id || !window.Echo) return;

    const channel = window.Echo.private(`chat.${params.id}`);
    channel.listen('.MessageSent', (e: any) => {
      console.log("🔥 EVENT TERIMA DI DESAINER:", e);
      const incomingMessage = e.message || e;
      
      // 🌟 FILTER CHAT REAL-TIME BERDASARKAN ITEM ID AGAR TIDAK BOCOR KE ITEM LAIN
      if (itemId && incomingMessage.order_item_id && String(incomingMessage.order_item_id) !== String(itemId)) {
        return;
      }

      if (incomingMessage.is_design === 1 || incomingMessage.is_design === "1") {
        incomingMessage.is_design = true;
      }

      // Jika gambar asli dari Laravel storage sudah datang lewat Echo, matikan blob preview lokal
      if (incomingMessage.file) {
        setUploadingBlob(null);
      }

      setMessages((prev) => {
        // Cek duplikasi ID asli dari Database
        if (prev.some(m => m.id === incomingMessage.id)) return prev;
        return [...prev, incomingMessage];
      });
      
      if (incomingMessage.message && incomingMessage.message.includes("[SISTEM]")) {
        setOrderInfo(prev => prev ? { ...prev, status: "siap_cetak" } : null);
      }
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });

    return () => {
      window.Echo?.leave(`chat.${params.id}`);
    };
  }, [params?.id, itemId]);

  useEffect(() => {
    fetchInitialData();
  }, [params?.id, itemId]);

  const fetchInitialData = async () => {
    if (!params?.id) return;
    setIsLoading(true);
    try {
      // 🌟 KIRIM KAN QUERY PARAMETER item_id KE LARAVEL BACKEND SANG JEMBATAN FILTER
      const urlMessages = itemId 
        ? `/orders/${params.id}/messages?item_id=${itemId}`
        : `/orders/${params.id}/messages`;

      const chatData = await apiFetch(urlMessages);
      setMessages(chatData.reverse());

      const orderData = await apiFetch(`/orders/${params.id}`);
      
      let mappedStatus: OrderInfo["status"] = "dikerjakan";
      if (orderData.current_stage_id === 2) mappedStatus = "siap_cetak";
      else if (orderData.current_stage_id === 3) mappedStatus = "dikerjakan";
      else if (orderData.current_stage_id === 5) mappedStatus = "selesai";

      // 🌟 UTAMAKAN ITEM YANG ID-NYA MATCH DENGAN QUERY PARAMETER URL
      const currentItem = orderData.order_items?.find((i: any) => String(i.id) === String(itemId)) || orderData.items?.find((i: any) => String(i.id) === String(itemId)) || orderData.items?.[0];
      
      let ukuranDisplay = "Ukuran Kustom";
      if (currentItem && currentItem.panjang && currentItem.lebar) {
        ukuranDisplay = `${Number(currentItem.panjang)} x ${Number(currentItem.lebar)} meter`;
      }

      setOrderInfo({
        order_code: orderData.order_code || "ORD-UNKNOWN",
        product_name: currentItem?.product?.name || "Produk Cetak",
        product_thumbnail_label: currentItem?.product?.name?.substring(0, 5).toUpperCase() || "PRINT",
        size: ukuranDisplay,
        qty: currentItem?.quantity || 1,
        status: mappedStatus
      });

    } catch (err) {
      console.error("Gagal memuat data awal:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !params?.id) return;

    const textToSend = inputText;
    setInputText("");

    try {
      const formData = new FormData();
      formData.append("sender", "desainer");
      formData.append("message", textToSend);
      
      // 🌟 SERTAKAN IDENTITAS order_item_id PADA CHAT TEKS
      if (itemId) {
        formData.append("order_item_id", String(itemId));
      }

      await apiFetch(`/orders/${params.id}/messages`, {
        method: "POST",
        body: formData,
      });
    } catch (err) {
      console.error("Gagal kirim:", err);
      setInputText(textToSend);
      alert("Gagal mengirim pesan. Silakan coba lagi.");
    }
  };

  const designFilesFromMessages = messages.filter((msg) => msg.file);

  if (isLoading || !orderInfo) {
    return <div className="p-6 text-sm text-slate-500 bg-slate-50 h-screen">Memuat ruang diskusi...</div>;
  }

  const badge = STATUS_BADGE[orderInfo.status];

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
      {/* TOPBAR */}
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 text-slate-600" />
          </Button>
          <div className="flex items-baseline gap-2">
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">Diskusi Desain –</h1>
            <Badge variant="secondary" className="font-mono text-indigo-600 bg-indigo-50 border-none px-2 py-0.5">
              {orderInfo.order_code}
            </Badge>
            {/* Tag visual penanda produk aktif */}
            <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded border border-slate-200">
              {orderInfo.product_name}
            </span>
          </div>
        </div>
        <Button variant="ghost" className="text-indigo-600 font-semibold hover:bg-indigo-50" onClick={() => router.push(`/desainer/order/${params?.id}`)}>
          Detail Pesanan
        </Button>
      </header>

      {/* MAIN LAYOUT */}
      <main className="flex flex-1 overflow-hidden">
        {/* CHAT PANEL */}
        <section className="flex-1 flex flex-col bg-[#F8FAFC]">
          <ScrollArea className="flex-1 px-6 py-6">
            {messages.length === 0 && !uploadingBlob ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                Belum ada riwayat pesan obrolan pada item produk ini.
              </div>
            ) : (
              Object.entries(
                messages.reduce((groups: Record<string, Message[]>, msg) => {
                  const dateKey = new Date(msg.created_at).toDateString();
                  if (!groups[dateKey]) groups[dateKey] = [];
                  groups[dateKey].push(msg);
                  return groups;
                }, {})
              ).map(([dateKey, msgs]) => (
                <div key={dateKey} className="mb-6 space-y-6">
                  <div className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest my-4">
                    {formatDateHeader(msgs[0].created_at)}
                  </div>

                  {msgs.map((msg) => {
                    const isDesainer = msg.sender === "desainer";
                    const time = new Date(msg.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

                    const memilikiFile = msg.file && msg.file.trim() !== "";
                    const merupakanDesain = msg.is_design === true || String(msg.is_design) === "1";

                    return (
                      <div key={msg.id} className={`flex gap-3 ${isDesainer ? "flex-row-reverse" : "flex-row"}`}>
                        <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                          <AvatarFallback className={isDesainer ? "bg-indigo-600 text-white" : "bg-sky-500 text-white"}>
                            {isDesainer ? "DS" : "CS"}
                          </AvatarFallback>
                        </Avatar>

                        <div className={`flex flex-col max-w-[70%] ${isDesainer ? "items-end" : "items-start"}`}>
                          <div className={`flex items-baseline gap-2 mb-1 ${isDesainer ? "flex-row-reverse" : "flex-row"}`}>
                            <span className="text-xs font-bold text-slate-700">{isDesainer ? "Desainer" : "Customer"}</span>
                            <span className="text-[10px] text-slate-400">{time}</span>
                          </div>

                          {memilikiFile || merupakanDesain ? (
                            <Card className="overflow-hidden border-slate-200 shadow-md max-w-[340px] rounded-2xl bg-white">
                              <img 
                               src={msg.file?.startsWith("blob:") ? msg.file : `${ASSET_URL}/storage/${msg.file}`}
                                alt="Desain" 
                                className="w-full h-44 object-cover border-b border-slate-100 cursor-zoom-in hover:opacity-95 transition-opacity" 
                                onClick={() => setPreviewImage(msg.file?.startsWith("blob:") ? msg.file : `${ASSET_URL}/storage/${msg.file}`)}
                                onError={(e) => console.error("Gagal memuat file gambar:", e.currentTarget.src)}
                              />
                              <CardContent className="p-4">
                                <p className="text-sm text-slate-600 leading-relaxed mb-3">{msg.message}</p>
                                <Badge className="bg-indigo-50 text-indigo-700 border-none py-1.5 px-4 rounded-full flex items-center gap-2 w-fit">
                                  <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                                  Pratinjau Desain Terkirim
                                </Badge>
                              </CardContent>
                            </Card>
                          ) : (
                            <div className={`px-4 py-3 text-[13.5px] leading-relaxed shadow-sm ${
                              isDesainer ? "bg-indigo-50 text-indigo-900 border border-indigo-100 rounded-2xl rounded-tr-sm" : "bg-white text-slate-700 border border-slate-200 rounded-2xl rounded-tl-sm"
                            }`}>
                              {msg.message}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
            
            {/* OPTIMISTIC VIEW UNTUK BUBBLE UPLOAD GAMBAR BARU */}
            {uploadingBlob && (
              <div className="flex gap-3 flex-row-reverse mb-6">
                <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                  <AvatarFallback className="bg-indigo-600 text-white">DS</AvatarFallback>
                </Avatar>
                <div className="flex flex-col max-w-[70%] items-end opacity-70">
                  <div className="flex items-baseline gap-2 mb-1 flex-row-reverse">
                    <span className="text-xs font-bold text-slate-700">Desainer</span>
                    <span className="text-[10px] text-slate-400">Mengupload...</span>
                  </div>
                  <Card className="overflow-hidden border-slate-200 shadow-md max-w-[340px] rounded-2xl bg-white">
                    <img src={uploadingBlob} alt="Uploading..." className="w-full h-44 object-cover border-b border-slate-100 blur-[1px]" />
                    <CardContent className="p-4">
                      <p className="text-sm text-slate-500 italic">Sedang mengirim berkas pratinjau desain terbaru...</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
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
              </div>
              <Button className="bg-indigo-600 hover:bg-indigo-700 px-6 rounded-xl font-bold transition-all active:scale-95" onClick={handleSend}>
                Kirim
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !params?.id) return;

                  const localBlobUrl = URL.createObjectURL(file);
                  setUploadingBlob(localBlobUrl);

                  try {
                    const formData = new FormData();
                    formData.append("sender", "desainer");
                    formData.append("file", file);
                    formData.append("is_design", "1");
                    formData.append("message", "Mengirim berkas pratinjau desain terbaru untuk Anda periksa.");

                    // 🌟 SERTAKAN IDENTITAS order_item_id PADA UPLOAD GAMBAR PREVIEW BARU
                    if (itemId) {
                      formData.append("order_item_id", String(itemId));
                    }

                    await apiFetch(`/orders/${params.id}/messages`, {
                      method: "POST",
                      body: formData,
                    });
                    
                    e.target.value = "";
                  } catch (err) {
                    console.error(err);
                    setUploadingBlob(null);
                    alert("Gagal mengunggah gambar.");
                  }
                }}
              />
            </div>
          </footer>
        </section>

        {/* SIDEBAR INFO */}
        <aside className="w-[300px] bg-white border-l border-slate-200 p-5 overflow-y-auto hidden lg:flex flex-col gap-8">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-4">Info Pesanan</h3>
            <div className="flex gap-3 p-3 rounded-2xl border border-slate-100 bg-slate-50/50">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] text-white font-black text-center leading-tight shrink-0 uppercase">
                {orderInfo.product_thumbnail_label}
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-bold text-slate-800 truncate">{orderInfo.product_name}</span>
                <span className="text-[11px] text-slate-500 font-medium">{orderInfo.size} · {orderInfo.qty} pcs</span>
                <Badge className={`w-fit mt-1 text-[10px] font-bold ${badge?.className}`}>
                  {badge?.label}
                </Badge>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-4">Riwayat File Desain</h3>
            <Button 
              variant="outline" 
              className="w-full border-dashed border-indigo-200 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 mb-4 rounded-xl py-5 border-2"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload File Desain
            </Button>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
              {designFilesFromMessages.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Belum ada file desain.</p>
              ) : (
                designFilesFromMessages.map((fileItem) => (
                  <div 
                    key={fileItem.id} 
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100 cursor-pointer transition-all"
                    onClick={() => setPreviewImage(`${ASSET_URL}/storage/${fileItem.file}`)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div className="overflow-hidden flex-1 flex flex-col min-w-0">
                      <span className="text-xs font-bold text-slate-700 truncate">{fileItem.file?.split('/').pop()}</span>
                      <span className="text-[10px] text-slate-400">{new Date(fileItem.created_at).toLocaleDateString("id-ID")}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </main>

      {/* MODAL CUSTOM PDF VIEWER LAYOUT */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[9999] flex flex-col bg-[#525659] text-white font-sans select-none"
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="flex items-center justify-between px-4 py-2 bg-[#323639] border-b border-[#202224] shadow-md h-12">
            <div className="flex items-center gap-3 min-w-0">
              <svg className="w-5 h-5 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
              </svg>
              <span className="text-sm font-medium truncate tracking-wide max-w-[200px] sm:max-w-xs">
                {previewImage.split('/').pop() || "Pratinjau_Desain.pdf"}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center bg-[#202224] px-3 py-1 rounded border border-neutral-700">
                <span>1</span>
                <span className="mx-1 text-neutral-500">/</span>
                <span className="text-neutral-400">1</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPreviewImage(null)}
                className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm transition-all"
              >
                Tutup
              </button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden bg-[#525659]">
            <div className="w-48 bg-[#323639] border-r border-[#202224] p-4 flex flex-col items-center overflow-y-auto hidden md:flex shrink-0">
              <div className="relative border-2 border-blue bg-white p-1 shadow-md w-32 aspect-[3/4] rounded">
                <img 
                  src={previewImage} 
                  alt="Thumbnail" 
                  className="w-full h-full object-contain opacity-60 filter grayscale"
                  onDragStart={(e) => e.preventDefault()}
                />
              </div>
              <span className="text-xs text-neutral-300 mt-2 font-medium">1</span>
            </div>

            <div className="flex-1 overflow-auto p-6 flex items-start justify-center bg-[#525659] no-scrollbar">
              <div className="relative bg-white p-8 shadow-2xl rounded-sm my-2 max-w-4xl">
                <img 
                  src={previewImage} 
                  alt="Konten Halaman" 
                  className="max-w-full h-auto object-contain pointer-events-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}