import React, { useState } from 'react';
import { Code2, Sparkles, CheckCircle, ShieldAlert, Cpu, Database, Eye } from 'lucide-react';
import { DomAnalysisResult } from '../types/ashk24.js';
import { toPersianDigits } from '../utils/persianUtils.js';

const SAMPLE_DIVAR_HTML = `
<form id="post-ad-form" action="/cpanel-backend/api/index.php?route=jobs/trigger" method="POST">
  <div class="form-group">
    <label>عنوان آگهی شما</label>
    <input type="text" name="txt_title_2026" id="txt_title" placeholder="عنوان مناسب مانند لپ‌تاپ لنوو..." required />
  </div>

  <div class="form-group">
    <label>شرح و توضیحات محصول</label>
    <textarea name="desc_body_area" rows="4" placeholder="توضیحات کامل شامل مشخصات..."></textarea>
  </div>

  <div class="form-group">
    <label>قیمت پیشنهادی (تومان)</label>
    <input type="number" name="inp_prc_val" id="price_field" placeholder="18500000" />
  </div>

  <div class="form-group">
    <label>شماره تلفن همراه صاحب آگهی</label>
    <input type="tel" name="txt_usr_99" id="mobile_number_input" placeholder="09123456789" required />
  </div>

  <div class="form-group">
    <label>کد تایید پیامک شده (OTP)</label>
    <input type="text" name="otp_code_inp" id="otp_code_verify" placeholder="5 رقمی" />
  </div>

  <button type="submit" class="btn-submit">ثبت نهایی آگهی</button>
</form>
`.trim();

export const DomAnalyzerModule: React.FC = () => {
  const [htmlInput, setHtmlInput] = useState<string>(SAMPLE_DIVAR_HTML);
  const [domain, setDomain] = useState<string>('divar.ir');
  const [loading, setLoading] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<DomAnalysisResult | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const res = await fetch('/cpanel-backend/api/index.php?route=ai/analyze-dom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          htmlSnippet: htmlInput,
          domain,
        }),
      });
      const data: DomAnalysisResult = await res.json();
      setAnalysisResult(data);
    } catch (e) {
      console.error('Failed to parse DOM:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2 space-x-reverse">
          <Code2 className="w-5 h-5 text-amber-400" />
          <span>تحلیلگر معنایی ساختار وب و فرم‌ها (Semantic DOM Engine)</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          شناسایی هوشمند فیلدهای مبهم فرم‌های نیازمندی‌ها (دیوار، شیپور...) از روی معنا، برچسب‌ها و الگوی ورودی
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Code */}
        <div className="lg:col-span-6 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">ورودی کد HTML فرم سایت هدف:</span>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="دامنه سایت"
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 outline-none w-32"
            />
          </div>

          <textarea
            rows={14}
            value={htmlInput}
            onChange={(e) => setHtmlInput(e.target.value)}
            className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 focus:border-amber-500 outline-none leading-relaxed"
          />

          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center space-x-2 space-x-reverse disabled:opacity-50"
          >
            {loading ? (
              <span>در حال آنالیز ساختار HTML...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>تحلیل معنایی فیلدها و استخراج Selector</span>
              </>
            )}
          </button>
        </div>

        {/* Results Analysis */}
        <div className="lg:col-span-6 space-y-4">
          {!analysisResult ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <Eye className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-300">منتظر اجرای آنالیز معنایی</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                کد HTML نمونه فرم را بررسی کرده و روی دکمه «تحلیل معنایی فیلدها» کلیک کنید.
              </p>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <span className="text-xs font-bold text-slate-200">نتایج استخراج فیلدها ({analysisResult.domain})</span>
                </div>
                <span className="text-[11px] px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  موتور: {analysisResult.parsedBy}
                </span>
              </div>

              <div className="space-y-2.5">
                {(analysisResult.detectedFields || []).map((field, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <span className="font-bold text-amber-400">{field.persianLabel}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          {field.mappingKey}
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-semibold">
                        دقت: %{toPersianDigits(field.confidenceScore)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                      <div>
                        نام فیلد HTML: <span className="font-mono text-slate-200">{field.fieldName}</span>
                      </div>
                      <div>
                        نوع ورودی: <span className="font-mono text-slate-200">{field.fieldType}</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 font-mono bg-slate-900 p-1.5 rounded border border-slate-800/80">
                      Selector: {field.detectedSelector}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
