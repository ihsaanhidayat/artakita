// "use client";
// import { useState } from "react";
// import { supabase } from "@/lib/supabaseClient";
// import { useRouter } from "next/navigation"; // <-- Import Router

// export default function LoginPage() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [loading, setLoading] = useState(false);
  
//   const router = useRouter(); // <-- Deklarasi Router di sini

//   const handleLogin = async (e) => {

//     e.preventDefault(); setLoading(true);

//     try {
//       const { data, error } = await supabase.auth.signInWithPassword({
//         email,
//         password,
//       });

//       console.log("DEBUG LOGIN:", data, error);

//       if (error) {
//         alert("Gagal Login: " + error.message);
//         setLoading(false); // Matikan loading jika error
//       } else {
//         // GUNAKAN HARD REDIRECT INI
//         // Ini memaksa browser memuat ulang dan mengirim cookie ke Middleware
//         window.location.href = "/";
//       }
//     } catch (err) {
//       console.error("🚨 ERROR SISTEM ASLI:", err);
//       alert("Sistem Error: " + err.message);
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-[#0a0f1c] p-6 relative overflow-hidden">
//       {/* Background Glow Effect */}
//       <div className="absolute w-96 h-96 bg-blue-500/20 rounded-full blur-[128px]"></div>

//       {/* Glassmorphism Card */}
//       <div className="relative z-10 w-full max-w-sm backdrop-blur-xl bg-white/5 border border-white/10 p-8 rounded-3xl shadow-2xl">
//         <h1 className="text-2xl font-bold text-white mb-2 text-center">ArtaKita</h1>
//         <p className="text-white/50 text-sm text-center mb-6">Akses Terbatas</p>
        
//         <form onSubmit={handleLogin} className="space-y-4">
//           <input 
//             type="email" 
//             placeholder="Email" 
//             className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-blue-500 outline-none"
//             onChange={(e) => setEmail(e.target.value)} 
//             required 
//           />
//           <input 
//             type="password" 
//             placeholder="Password" 
//             className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-blue-500 outline-none"
//             onChange={(e) => setPassword(e.target.value)} 
//             required 
//           />
//           <button 
//             type="submit" 
//             disabled={loading}
//             className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all"
//           >
//             {loading ? "Memverifikasi..." : "Masuk"}
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// }