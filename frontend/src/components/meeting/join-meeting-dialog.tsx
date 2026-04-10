'use client';

import { useState, useEffect } from 'react';
import { UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface JoinMeetingDialogProps {
  isOpen: boolean;
  onJoin: (name: string) => void;
}

export const JoinMeetingDialog = ({ isOpen, onJoin }: JoinMeetingDialogProps) => {
  const [name, setName] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onJoin(name.trim());
    }
  };

  if (!isMounted || !isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]" />

      {/* Dialog */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-[101] px-4">
        <div className="bg-[#1c1c1c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
          {/* Header */}
          <div className="p-8 text-center bg-gradient-to-b from-white/5 to-transparent">
            <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4 ring-1 ring-blue-500/30">
              <UserIcon className="w-8 h-8 text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Joining Meeting</h2>
            <p className="text-gray-400 text-sm">
              Please enter your name to join the conversation.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 pt-0">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Your Name
                </label>
                <Input
                  id="name"
                  placeholder="Enter your name..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-black/40 border-white/10 text-white h-12 focus:ring-blue-500 focus:border-blue-500 rounded-xl"
                  autoFocus
                  required
                />
              </div>

              <Button 
                type="submit" 
                disabled={!name.trim()}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-blue-500/20"
              >
                Join Now
              </Button>
            </div>
          </form>

          {/* Footer */}
          <div className="p-4 bg-white/5 text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em]">
              NexaCall Premium Experience
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
