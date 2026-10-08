import { useState } from 'react'
import { Copy, Check, Play, Terminal } from 'lucide-react'
import { api } from '../lib/api'

interface Props {
  language: string
  code: string
}

interface RunResult {
  stdout: string
  stderr: string
  exit_code: number
}

export default function CodeBlock({ language, code }: Props) {
  const [copied, setCopied] = useState(false)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<RunResult | null>(null)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = code
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRun = async () => {
    if (language !== 'python') return
    setRunning(true)
    setResult(null)
    try {
      const res = await api.runCode(code, language)
      setResult(res)
    } catch (e) {
      setResult({
        stdout: '',
        stderr: e instanceof Error ? e.message : 'Execution failed',
        exit_code: 1,
      })
    } finally {
      setRunning(false)
    }
  }

  const showRun = language === 'python'

  return (
    <div className="my-3 rounded-card overflow-hidden border border-light-border dark:border-dark-border bg-[#1E1E1E] dark:bg-[#1E1E1E]">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10">
        <span className="text-xs text-gray-400 font-mono">{language}</span>
        <div className="flex items-center gap-1">
          {showRun && (
            <button
              onClick={handleRun}
              disabled={running}
              className="flex items-center gap-1 rounded-item px-2 py-0.5 text-xs text-gray-400 hover:text-claude-clay transition-colors disabled:opacity-50"
            >
              <Play size={12} />
              {running ? 'Running…' : 'Run'}
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-item px-2 py-0.5 text-xs text-gray-400 hover:text-claude-clay transition-colors"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy code'}
          </button>
        </div>
      </div>
      {/* Code */}
      <pre className="p-3 overflow-x-auto">
        <code className="font-mono text-sm text-gray-300">{code}</code>
      </pre>
      {/* Run result */}
      {result && (
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
            <Terminal size={12} />
            <span>Output (exit code: {result.exit_code})</span>
          </div>
          {result.stdout && (
            <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap mb-1">{result.stdout}</pre>
          )}
          {result.stderr && (
            <pre className="text-xs font-mono text-red-400 whitespace-pre-wrap">{result.stderr}</pre>
          )}
        </div>
      )}
    </div>
  )
}
