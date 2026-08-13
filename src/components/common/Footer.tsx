import React from 'react';
import { GraduationCap, Youtube, Send, Instagram, MessageCircle, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Column 1: Brand Info */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                GRADEUP <span className="text-blue-400">STUDY</span>
              </h3>
            </div>
            <p className="text-sm text-slate-400 mb-4 max-w-md leading-relaxed">
              Your Trusted Partner During Preparation. Empowering competitive exam aspirants in Himachal Pradesh and across India with accurate, real-exam patterned online mock tests and detailed performance analytics.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://youtube.com/@gradeupstudy"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-300 flex items-center justify-center transition-colors"
                title="YouTube"
              >
                <Youtube className="w-5 h-5" />
              </a>
              <a
                href="https://t.me/gradeupstudy"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-blue-500 hover:text-white text-slate-300 flex items-center justify-center transition-colors"
                title="Telegram"
              >
                <Send className="w-5 h-5" />
              </a>
              <a
                href="https://instagram.com/gradeupstudy"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-pink-600 hover:text-white text-slate-300 flex items-center justify-center transition-colors"
                title="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://whatsapp.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 flex items-center justify-center transition-colors"
                title="WhatsApp Channel"
              >
                <MessageCircle className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Column 2: Quick Exam Categories */}
          <div>
            <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-3">Popular Exams</h4>
            <ul className="space-y-2 text-sm">
              <li><span className="hover:text-blue-400 transition-colors cursor-pointer">HP Police Constable Test</span></li>
              <li><span className="hover:text-blue-400 transition-colors cursor-pointer">HP Patwari Exam 2026</span></li>
              <li><span className="hover:text-blue-400 transition-colors cursor-pointer">HP JBT / TET Entrance</span></li>
              <li><span className="hover:text-blue-400 transition-colors cursor-pointer">HP Forest Guard Paper</span></li>
              <li><span className="hover:text-blue-400 transition-colors cursor-pointer">Himachal Pradesh Allied Services</span></li>
            </ul>
          </div>

          {/* Column 3: Contact & Legal */}
          <div>
            <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-3">Support & Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><span>Email: support@gradeupstudy.com</span></li>
              <li><span>Helpline: +91 98160 00000</span></li>
              <li className="pt-2"><span className="hover:text-blue-400 cursor-pointer">Privacy Policy</span></li>
              <li><span className="hover:text-blue-400 cursor-pointer">Terms & Conditions</span></li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} Gradeup Study. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> for Competitive Exam Aspirants
          </p>
        </div>
      </div>
    </footer>
  );
};
