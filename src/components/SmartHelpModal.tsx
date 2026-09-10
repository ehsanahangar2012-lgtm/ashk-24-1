import React, { useState } from 'react';
import { HelpCircle, X, ShieldCheck, Cpu, ArrowRight } from 'lucide-react';

export interface SmartHelpContent {
  title: string;
  summary: string;
  steps: string[];
  offlineNote?: string;
}

interface SmartHelpModalProps {
  content: SmartHelpContent;
  buttonClassName?: string;
}

export const SmartHelpButton: React.FC<SmartHelpModalProps> = ({
  content,
  buttonClassName = 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={buttonClassName}
        title="راهنمای هوشمند این بخش (?)"
      >
        <HelpCircle className="w-4 h-4 text-blue-400" />
        <span>راهنمای بخش</span>
        <span className="bg-blue-500 text-slate-950 px-1.5 py-0.2 text-[10px] font-black rounded-full">؟</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in dir-rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute left-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                <HelpCircle className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">{content.title}</h3>
                <p className="text-xs text-blue-400 font-medium">راهنمای هوشمند و متنی بخش</p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-slate-300">
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                <p className="text-xs text-slate-300 leading-relaxed font-medium">{content.summary}</p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                  مراحل و راهنمای عملیاتی:
                </h4>
                <ul className="space-y-2">
                  {(content?.steps || []).map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-300 bg-slate-800/40 p-2.5 rounded-lg">
                      <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {content.offlineNote && (
                <div className="bg-emerald-950/40 border border-emerald-800/50 p-3 rounded-xl flex items-start gap-2 text-xs text-emerald-300">
                  <Cpu className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  <div>
                    <strong className="block font-bold mb-0.5">پشتیبانی کامل از cPanel و عدم نیاز به هوش خارجی:</strong>
                    <span>{content.offlineNote}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors"
              >
                متوجه شدم، متشکرم
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
