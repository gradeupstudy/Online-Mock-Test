import React, { useState, useEffect } from 'react';
import { GraduationCap, Youtube, Send, Instagram, MessageCircle, Heart } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { DEMO_ADMIN_SETTINGS } from '../../data/demoData';

export const Footer: React.FC = () => {
  const [socialLinks, setSocialLinks] = useState({
    youtube: DEMO_ADMIN_SETTINGS.youtube_channel || 'https://youtube.com/@gradeupstudy',
    telegram: DEMO_ADMIN_SETTINGS.telegram_channel || 'https://t.me/gradeupstudy',
    instagram: DEMO_ADMIN_SETTINGS.instagram_handle || 'https://instagram.com/gradeupstudy',
    whatsapp: DEMO_ADMIN_SETTINGS.whatsapp_channel_url || 'https://whatsapp.com/channel/gradeupstudy',
    brandName: DEMO_ADMIN_SETTINGS.brand_name || 'Gradeup Study',
    supportEmail: DEMO_ADMIN_SETTINGS.support_email || 'support@gradeupstudy.com',
  });

  const loadLinks = async () => {
    try {
      const settings = await dataService.getSettings();
      const platforms = await dataService.getSocialPlatforms(true);

      const ytPlatform = platforms.find(p => (p.platform_name || '').toLowerCase().includes('youtube') || p.icon === 'youtube');
      const tgPlatform = platforms.find(p => (p.platform_name || '').toLowerCase().includes('telegram') || p.icon === 'send');
      const igPlatform = platforms.find(p => (p.platform_name || '').toLowerCase().includes('instagram') || p.icon === 'instagram');
      const waPlatform = platforms.find(p => (p.platform_name || '').toLowerCase().includes('whatsapp') || p.icon === 'message-circle');

      setSocialLinks({
        youtube: settings.youtube_channel || ytPlatform?.platform_url || 'https://youtube.com/@gradeupstudy',
        telegram: settings.telegram_channel || tgPlatform?.platform_url || 'https://t.me/gradeupstudy',
        instagram: settings.instagram_handle || igPlatform?.platform_url || 'https://instagram.com/gradeupstudy',
        whatsapp: settings.whatsapp_channel_url || waPlatform?.platform_url || (settings.whatsapp_number ? `https://wa.me/${settings.whatsapp_number.replace(/[^0-9]/g, '')}` : 'https://whatsapp.com/channel/gradeupstudy'),
        brandName: settings.brand_name || 'Gradeup Study',
        supportEmail: settings.support_email || 'support@gradeupstudy.com',
      });
    } catch (e) {
      console.warn('Error loading footer settings:', e);
    }
  };

  useEffect(() => {
    loadLinks();

    const handleUpdate = () => {
      loadLinks();
    };

    window.addEventListener('gradeup_settings_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('gradeup_settings_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return (
    <footer className="bg-slate-900 text-slate-400 py-10 sm:py-14 border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          
          {/* Column 1: Brand Info */}
          <div className="sm:col-span-2 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                GRADEUP <span className="text-blue-400">STUDY</span>
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md leading-relaxed">
              Your Trusted Partner During Preparation. Empowering competitive exam aspirants in Himachal Pradesh and across India with accurate, real-exam patterned online mock tests and detailed performance analytics.
            </p>
            <div className="flex items-center gap-2.5 pt-2">
              <a
                href={socialLinks.youtube}
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-300 flex items-center justify-center transition-colors shadow-xs"
                title="YouTube Channel"
              >
                <Youtube className="w-4 h-4" />
              </a>
              <a
                href={socialLinks.telegram}
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-blue-500 hover:text-white text-slate-300 flex items-center justify-center transition-colors shadow-xs"
                title="Telegram Channel"
              >
                <Send className="w-4 h-4" />
              </a>
              <a
                href={socialLinks.instagram}
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-pink-600 hover:text-white text-slate-300 flex items-center justify-center transition-colors shadow-xs"
                title="Instagram Profile"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href={socialLinks.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 flex items-center justify-center transition-colors shadow-xs"
                title="WhatsApp Channel / Community"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Column 2: Quick Exam Categories */}
          <div className="space-y-3">
            <h4 className="text-xs sm:text-sm font-bold text-slate-200 uppercase tracking-wider">Popular Exams</h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li><span className="hover:text-blue-400 transition-colors cursor-pointer">HP Police Constable Test</span></li>
              <li><span className="hover:text-blue-400 transition-colors cursor-pointer">HP Patwari Exam 2026</span></li>
              <li><span className="hover:text-blue-400 transition-colors cursor-pointer">HP JBT / TET Entrance</span></li>
              <li><span className="hover:text-blue-400 transition-colors cursor-pointer">HP Forest Guard Paper</span></li>
              <li><span className="hover:text-blue-400 transition-colors cursor-pointer">HP Allied Services</span></li>
            </ul>
          </div>

          {/* Column 3: Contact & Legal */}
          <div className="space-y-3">
            <h4 className="text-xs sm:text-sm font-bold text-slate-200 uppercase tracking-wider">Support & Info</h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li><span>Email: {socialLinks.supportEmail}</span></li>
              <li><span>Official Study Portal</span></li>
              <li className="pt-1"><span className="hover:text-blue-400 cursor-pointer">Privacy Policy</span></li>
              <li><span className="hover:text-blue-400 cursor-pointer">Terms & Conditions</span></li>
            </ul>
          </div>

        </div>

        <div className="pt-6 sm:pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3 text-center sm:text-left">
          <p>© {new Date().getFullYear()} {socialLinks.brandName}. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> for Aspirants
          </p>
        </div>
      </div>
    </footer>
  );
};


