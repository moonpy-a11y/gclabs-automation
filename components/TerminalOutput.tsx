
import React, { useState } from 'react';

interface Props {
  commands: string[];
  framework: string;
  variant?: 'default' | 'fix';
  label?: string;
}

const TerminalOutput: React.FC<Props> = ({ commands, framework, variant = 'default', label }) => {
  const [copied, setCopied] = useState(false);

  const fullCommand = commands.join('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(fullCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isFix = variant === 'fix';

  return (
    <div className={`rounded-lg overflow-hidden my-4 shadow-xl border ${isFix ? 'bg-amber-950 border-amber-600' : 'bg-gray-900 border-gray-700'}`}>
      <div className={`flex items-center justify-between px-4 py-2 border-b ${isFix ? 'bg-amber-900 border-amber-700' : 'bg-gray-800 border-gray-700'}`}>
        <div className="flex gap-1.5 items-center">
          {isFix ? (
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-tighter flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"></path></svg>
              Corrected Script
            </span>
          ) : (
            <>
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              {label && <span className="ml-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>}
            </>
          )}
        </div>
        <div className="text-xs text-gray-400 font-mono flex items-center gap-2">
          <span className="uppercase">{framework}</span>
          <button 
            onClick={handleCopy}
            className="hover:text-white transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
      <div className={`p-4 terminal-font text-sm overflow-x-auto whitespace-pre ${isFix ? 'text-amber-200' : 'text-green-400'}`}>
        {commands.map((cmd, i) => (
          <div key={i} className="flex gap-4">
            <span className={`${isFix ? 'text-amber-700' : 'text-gray-600'} select-none`}>{(i + 1).toString().padStart(2, '0')}</span>
            <span>{cmd}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TerminalOutput;
