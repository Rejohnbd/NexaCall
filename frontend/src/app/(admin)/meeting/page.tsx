'use client';

import { useEffect, useState } from 'react';
import {
  PlusIcon,
  Download,
  Play,
  MoreVertical,
  RefreshCw,
  Clock,
  FileVideo,
  ExternalLink
} from 'lucide-react';
import { CreateMeetingDialog } from '@/components/meeting/create-meeting-dialog';
import { meetingApi, MeetingResponse } from '@/lib/api/meeting';
import { useRouter } from 'next/navigation';

export default function MeetingPage() {
  const [meetings, setMeetings] = useState<MeetingResponse[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const router = useRouter();

  const loadMeetings = async () => {
    setIsLoadingMeetings(true);
    try {
      const data = await meetingApi.getMeetings();
      setMeetings(data);
    } catch (error) {
      console.error('Failed to load meetings', error);
    } finally {
      setIsLoadingMeetings(false);
    }
  };

  useEffect(() => {
    loadMeetings();

    const handleFocus = () => loadMeetings();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  const handleMeetingCreated = (meetingId: string, roomId: string) => {
    router.push(`/meeting/${roomId}`);
  };

  const handleDownload = (roomId: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://103.113.13.2/api';
    // Use an anchor tag to force download
    const link = document.createElement('a');
    link.href = `${apiUrl}/meetings/video/${roomId}`;
    link.download = `recording-${roomId}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePlay = (roomId: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://103.113.13.2/api';
    setPreviewVideoUrl(`${apiUrl}/meetings/video/${roomId}`);
  };

  const handleJoinExisting = (roomId: string) => {
    router.push(`/meeting/${roomId}`);
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds || seconds <= 0) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (value?: string | null) => {
    if (!value) return 'N/A';
    return new Date(value).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <div className="flex flex-1 flex-col space-y-6 p-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white border-none">Meeting Sessions</h1>
            <p className="text-sm text-slate-400">Review and manage your meeting recordings and active sessions.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadMeetings}
              disabled={isLoadingMeetings}
              className="h-10 w-10 inline-flex items-center justify-center rounded-md border border-white/10 bg-transparent text-sm font-medium hover:bg-white/5 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-slate-400 ${isLoadingMeetings ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsDialogOpen(true)}
              className="h-10 inline-flex items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90 transition-colors shadow-sm"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              New Meeting
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="rounded-md border border-white/10 bg-transparent overflow-hidden">
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm border-collapse">
              <thead className="border-b border-white/10 bg-white/[0.02]">
                <tr className="transition-colors hover:bg-muted/50">
                  <th className="h-12 px-4 text-left align-middle font-medium text-slate-400">Session</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-slate-400">Host</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-slate-400">Status</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-slate-400">Duration</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {isLoadingMeetings ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center align-middle">
                      <div className="flex items-center justify-center gap-2 text-slate-400 font-medium">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Loading meetings...
                      </div>
                    </td>
                  </tr>
                ) : meetings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center align-middle text-slate-500 font-medium text-lg">
                      No meeting records found.
                    </td>
                  </tr>
                ) : (
                  meetings.map((meeting) => (
                    <tr
                      key={meeting.id}
                      className="border-b border-white/5 transition-colors hover:bg-white/[0.03] data-[state=selected]:bg-muted"
                    >
                      <td className="p-4 align-middle">
                        <div className="flex flex-col gap-1">
                          <div className="font-semibold text-slate-100 flex items-center gap-2">
                            {meeting.isActive && (
                              <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                            )}
                            {meeting.title || 'Untitled Session'}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded italic">#{meeting.roomId}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(meeting.createdAt)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-[10px] font-bold text-indigo-400 border border-indigo-500/20">
                            {(meeting.hostName || meeting.hostEmail?.[0] || '?').substring(0, 1).toUpperCase()}
                          </div>
                          <span className="text-slate-300 truncate max-w-[150px] font-medium">
                            {meeting.hostName || meeting.hostEmail || 'System'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight border ${meeting.recordingStatus === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : meeting.recordingStatus === 'recording'
                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse'
                                : meeting.recordingStatus === 'failed'
                                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                  : 'bg-white/5 text-slate-400 border-white/10'
                            }`}
                        >
                          {meeting.recordingStatus}
                        </span>
                      </td>
                      <td className="p-4 align-middle">
                        <span className="text-slate-400 font-medium tabular-nums">{formatDuration(meeting.duration)}</span>
                      </td>
                      <td className="p-4 align-middle text-right">
                        <div className="flex items-center justify-end gap-2">
                          {meeting.isActive ? (
                            <button
                              onClick={() => handleJoinExisting(meeting.roomId)}
                              className="h-8 inline-flex items-center justify-center rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm active:scale-95"
                            >
                              Join
                            </button>
                          ) : meeting.recordingStatus === 'completed' ? (
                            <>
                              <button
                                onClick={() => handleDownload(meeting.roomId)}
                                className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-white/10 hover:bg-white/5 transition-colors text-slate-400 hover:text-white"
                                title="Download"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handlePlay(meeting.roomId)}
                                className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-white/10 hover:bg-white/5 transition-colors text-slate-400 hover:text-white"
                                title="Play"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <button className="h-8 w-8 inline-flex items-center justify-center opacity-30 cursor-not-allowed">
                              <MoreVertical className="w-3.5 h-3.5 text-slate-500" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Video Preview Modal */}
      {previewVideoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="relative w-full max-w-4xl bg-[#0B0D0F] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">Recording Preview</h3>
              <button
                onClick={() => setPreviewVideoUrl(null)}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <PlusIcon className="w-6 h-6 rotate-45" />
              </button>
            </div>
            <div className="aspect-video bg-black flex items-center justify-center">
              <video
                src={previewVideoUrl}
                controls
                autoPlay
                className="w-full h-full"
              >
                Your browser does not support the video tag.
              </video>
            </div>
            <div className="p-4 bg-white/5 text-center">
              <button
                onClick={() => window.open(previewVideoUrl, '_blank')}
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-medium flex items-center justify-center gap-2 mx-auto"
              >
                Open in new tab <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      <CreateMeetingDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={handleMeetingCreated}
      />
    </>
  );
}
