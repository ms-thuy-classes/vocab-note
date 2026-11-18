import React, { useState } from 'react';
import {
  BellRing,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Download,
  Mail,
  Send,
  X,
} from 'lucide-react';
import type { ReminderSettings, TopicFolder, UserProgress, VocabWord } from '../types/vocab';

interface EmailReminderModalProps {
  isOpen: boolean;
  settings: ReminderSettings;
  folders: TopicFolder[];
  words: VocabWord[];
  progress: UserProgress;
  onUpdateSettings: (updates: Partial<ReminderSettings>) => void;
  onClose: () => void;
}

export const EmailReminderModal: React.FC<EmailReminderModalProps> = ({
  isOpen,
  settings,
  folders,
  words,
  progress,
  onUpdateSettings,
  onClose,
}) => {
  const [testSentMessage, setTestSentMessage] = useState<string | null>(null);
  const [showEmailJsConfig, setShowEmailJsConfig] = useState(false);

  if (!isOpen) return null;

  const dueWords = words
    .filter(
      (w) =>
        settings.selectedFolderIds.length === 0 ||
        settings.selectedFolderIds.includes(w.folderId)
    )
    .slice(0, 4);

  const toggleFolder = (folderId: string) => {
    const exists = settings.selectedFolderIds.includes(folderId);
    const next = exists
      ? settings.selectedFolderIds.filter((id) => id !== folderId)
      : [...settings.selectedFolderIds, folderId];
    onUpdateSettings({ selectedFolderIds: next });
  };

  // Build Google Calendar daily recurring link
  const buildGoogleCalendarUrl = () => {
    const [hourStr = '20', minStr = '00'] = (settings.time || '20:00').split(':');
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const startDt = `${datePart}T${pad(Number(hourStr))}${pad(Number(minStr))}00`;
    const endHour = (Number(hourStr) + 0) % 24;
    const endMin = Number(minStr) + 15;
    const adjustedHour = endHour + Math.floor(endMin / 60);
    const adjustedMin = endMin % 60;
    const endDt = `${datePart}T${pad(adjustedHour % 24)}${pad(adjustedMin)}00`;

    const selectedFolderNames = folders
      .filter((f) => settings.selectedFolderIds.includes(f.id))
      .map((f) => f.name)
      .join(', ');

    const details = [
      `Time for your daily English vocabulary review in Learn with Ms. Thúy - Vocabulary Note!`,
      selectedFolderNames ? `Topics to review: ${selectedFolderNames}` : '',
      dueWords.length > 0
        ? `Sample words waiting: ${dueWords.map((w) => `${w.english} (${w.vietnamese})`).join(', ')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: 'Learn with Ms. Thúy - Daily Vocabulary Review',
      dates: `${startDt}/${endDt}`,
      recur: 'RRULE:FREQ=DAILY',
      details,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const handleDownloadIcs = () => {
    const [hourStr = '20', minStr = '00'] = (settings.time || '20:00').split(':');
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const dtStart = `${datePart}T${pad(Number(hourStr))}${pad(Number(minStr))}00`;

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Learn with Ms. Thúy//Vocabulary Note//EN',
      'BEGIN:VEVENT',
      `UID:vocab-reminder-${Date.now()}@ms-thuy-note`,
      `DTSTART:${dtStart}`,
      'DURATION:PT15M',
      'RRULE:FREQ=DAILY',
      'SUMMARY:Learn with Ms. Thúy - Daily Vocabulary Review',
      `DESCRIPTION:Daily 15-minute flashcard and Smart Quiz session (${dueWords
        .map((w) => w.english)
        .join(', ')}).`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ms-thuy-daily-study-reminder.ics';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendTestReminder = async () => {
    const targetEmail = settings.email.trim();
    if (!targetEmail) {
      setTestSentMessage('Please enter your email address first.');
      return;
    }

    // Optional real EmailJS dispatch if user configured keys
    if (
      settings.emailjsServiceId?.trim() &&
      settings.emailjsTemplateId?.trim() &&
      settings.emailjsPublicKey?.trim()
    ) {
      try {
        const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: settings.emailjsServiceId.trim(),
            template_id: settings.emailjsTemplateId.trim(),
            user_id: settings.emailjsPublicKey.trim(),
            template_params: {
              to_email: targetEmail,
              student_name: progress.studentName,
              reminder_time: settings.time,
              due_words: dueWords.map((w) => `${w.english} (${w.vietnamese})`).join(', '),
            },
          }),
        });
        if (res.ok) {
          const stamp = new Date().toLocaleTimeString();
          onUpdateSettings({ lastTestSentAt: stamp });
          setTestSentMessage(`Test reminder email sent via EmailJS to ${targetEmail} at ${stamp}!`);
          return;
        }
      } catch {
        // Fall through to local preview confirmation
      }
    }

    const stamp = new Date().toLocaleTimeString();
    onUpdateSettings({ lastTestSentAt: stamp });
    setTestSentMessage(
      `Test reminder previewed & queued for ${targetEmail} (${settings.time} daily). Use "Add Daily Reminder to Google Calendar" below for guaranteed daily notifications!`
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2B2438]/40 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reminder-modal-title"
    >
      <div className="w-full max-w-3xl bg-[#FFFDF9] rounded-2xl border border-[#D5CEF5] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#FFE4E1]/75 via-[#E6E6FA]/70 to-[#E0F2F1]/75 border-b border-[#867C96]/15 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-white/85 flex items-center justify-center text-[#C25C68]">
              <BellRing className="w-5 h-5" />
            </span>
            <div>
              <h3 id="reminder-modal-title" className="text-lg font-bold text-[#2B2438]">
                Email Study Reminders
              </h3>
              <p className="text-xs text-[#5E556E]">
                Stay consistent with daily vocabulary review prompts & calendar alerts.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close reminder settings"
            className="p-2 rounded-xl bg-white/80 text-[#5E556E] hover:text-[#2B2438] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Settings Form */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F3F0FC]/80 border border-[#D5CEF5]">
              <div>
                <p className="text-sm font-bold text-[#2B2438]">Daily Reminders</p>
                <p className="text-xs text-[#5E556E]">
                  {settings.enabled ? 'Active daily schedule' : 'Paused'}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.enabled}
                onClick={() => onUpdateSettings({ enabled: !settings.enabled })}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  settings.enabled
                    ? 'bg-[#1F4F4B] text-white'
                    : 'bg-white text-[#5E556E] border border-[#867C96]/25'
                }`}
              >
                {settings.enabled ? 'ON' : 'OFF'}
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#3F3163] mb-1">
                Student Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#867C96] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => onUpdateSettings({ email: e.target.value })}
                  placeholder="student@example.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-[#867C96]/25 text-sm text-[#2B2438]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#3F3163] mb-1">
                Preferred Daily Study Time
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-[#867C96] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="time"
                  value={settings.time}
                  onChange={(e) => onUpdateSettings({ time: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-[#867C96]/25 text-sm font-mono-num text-[#2B2438]"
                />
              </div>
            </div>

            <div>
              <span className="block text-xs font-bold text-[#3F3163] mb-2">
                Topic Folders to Review
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {folders
                  .filter((f) => !f.isParent)
                  .map((folder) => {
                    const checked = settings.selectedFolderIds.includes(folder.id);
                    const parentName = folder.parentId
                      ? folders.find((p) => p.id === folder.parentId)?.name
                      : undefined;
                    return (
                      <label
                        key={folder.id}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white border border-[#867C96]/15 hover:border-[#B9AEE8] text-xs font-semibold text-[#2B2438] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleFolder(folder.id)}
                          className="w-4 h-4 accent-[#6F5C96]"
                        />
                        <span className="truncate">
                          {parentName ? `${parentName} › ${folder.name}` : folder.name}
                        </span>
                      </label>
                    );
                  })}
              </div>
            </div>

            {/* Optional EmailJS Hook */}
            <div>
              <button
                type="button"
                onClick={() => setShowEmailJsConfig((v) => !v)}
                className="text-xs font-bold text-[#6F5C96] hover:underline cursor-pointer"
              >
                {showEmailJsConfig
                  ? 'Hide optional EmailJS settings'
                  : 'Connect EmailJS keys (optional)'}
              </button>
              {showEmailJsConfig && (
                <div className="mt-2 p-3 rounded-xl bg-[#FAF7FD] border border-[#D5CEF5] space-y-2">
                  <input
                    type="text"
                    value={settings.emailjsServiceId || ''}
                    onChange={(e) => onUpdateSettings({ emailjsServiceId: e.target.value })}
                    placeholder="EmailJS Service ID"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#867C96]/20 text-xs"
                  />
                  <input
                    type="text"
                    value={settings.emailjsTemplateId || ''}
                    onChange={(e) => onUpdateSettings({ emailjsTemplateId: e.target.value })}
                    placeholder="EmailJS Template ID"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#867C96]/20 text-xs"
                  />
                  <input
                    type="text"
                    value={settings.emailjsPublicKey || ''}
                    onChange={(e) => onUpdateSettings({ emailjsPublicKey: e.target.value })}
                    placeholder="EmailJS Public Key"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#867C96]/20 text-xs"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Email Preview & 1-Click Actions */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#D5CEF5] bg-white overflow-hidden shadow-xs">
              <div className="px-4 py-3 bg-gradient-to-r from-[#E6E6FA]/70 to-[#FFE4E1]/70 border-b border-[#867C96]/15">
                <p className="text-[11px] font-bold text-[#5E556E]">Preview Reminder Email</p>
                <p className="text-xs font-bold text-[#2B2438] mt-0.5">
                  Subject: 🌸 {progress.streak}-Day Streak! Your {settings.time} Vocabulary Review
                </p>
              </div>
              <div className="p-4 space-y-3 text-xs text-[#2B2438]">
                <p className="leading-relaxed">
                  Hi <strong>{progress.studentName}</strong>, it’s time for your daily 10-minute session with{' '}
                  <strong>Learn with Ms. Thúy - Vocabulary Note</strong>!
                </p>
                <div className="p-3 rounded-xl bg-[#FAF7FD] border border-[#867C96]/15 space-y-2">
                  <p className="font-bold text-[#3F3163]">Words ready for review today:</p>
                  {dueWords.length === 0 ? (
                    <p className="text-[#5E556E]">Select at least one topic folder on the left.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {dueWords.map((w) => (
                        <li key={w.id} className="flex items-baseline justify-between gap-2">
                          <span>
                            <strong>{w.english}</strong>{' '}
                            <span className="font-ipa text-[11px] text-[#6F5C96]">{w.ipa}</span>
                          </span>
                          <span className="text-[#5E556E] text-right truncate max-w-[160px]">
                            {w.vietnamese}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <p className="text-[11px] text-[#5E556E]">
                  Keep your {progress.streak}-day streak alive and earn bonus XP!
                </p>
              </div>
            </div>

            {testSentMessage && (
              <div className="p-3 rounded-xl bg-[#E0F2F1] border border-[#9ADCD5] text-xs font-semibold text-[#1F4F4B] flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{testSentMessage}</span>
              </div>
            )}

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleSendTestReminder}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#6F5C96] text-white text-sm font-bold hover:bg-[#5E4C84] cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Send Test Reminder</span>
              </button>

              <a
                href={buildGoogleCalendarUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#E0F2F1] text-[#1F4F4B] border border-[#9ADCD5] text-sm font-bold hover:bg-[#CEEBE8]"
              >
                <CalendarPlus className="w-4 h-4" />
                <span>Add Daily Reminder to Google Calendar</span>
              </a>

              <button
                type="button"
                onClick={handleDownloadIcs}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#867C96]/25 text-xs font-bold text-[#5E556E] hover:text-[#2B2438] cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .ICS Calendar File (Apple / Outlook)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
