'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  Search,
  Copy,
  Check,
  Play,
  ChevronDown,
  Terminal,
  Code,
  Shield,
  Building2,
  Route,
  LayoutGrid,
  Clock,
  ScrollText,
  BarChart3,
  Store,
  Key,
  CreditCard,
  Receipt,
  Bell,
  Loader2,
  AlertCircle,
  ExternalLink,
  X,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  apiCategories,
  apiEndpoints,
  type ApiEndpoint,
  type ApiCategoryId,
} from '@/lib/api-endpoints'

// ─── Props ───────────────────────────────────────────────────────
interface ApiDocumentationProps {
  stationId: string
}

// ─── Method badge colors ─────────────────────────────────────────
const methodStyles: Record<string, { bg: string; text: string; border: string }> = {
  GET: { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/30' },
  POST: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  PATCH: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
  DELETE: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
  PUT: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
}

// ─── Category icon map ───────────────────────────────────────────
const categoryIcons: Record<string, React.ReactNode> = {
  auth: <Shield className="h-4 w-4" />,
  stations: <Building2 className="h-4 w-4" />,
  lines: <Route className="h-4 w-4" />,
  platforms: <LayoutGrid className="h-4 w-4" />,
  schedules: <Clock className="h-4 w-4" />,
  ticker: <ScrollText className="h-4 w-4" />,
  analytics: <BarChart3 className="h-4 w-4" />,
  marketplace: <Store className="h-4 w-4" />,
  'api-keys': <Key className="h-4 w-4" />,
  subscriptions: <CreditCard className="h-4 w-4" />,
  invoices: <Receipt className="h-4 w-4" />,
  notifications: <Bell className="h-4 w-4" />,
}

// ─── Copy hook ───────────────────────────────────────────────────
function useCopyToClipboard() {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copy = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // Fallback for non-HTTPS
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }, [])

  return { copiedId, copy }
}

// ─── JSON Code Block ────────────────────────────────────────────
function JsonCodeBlock({
  data,
  title,
  copyId,
  onCopy,
  isCopied,
}: {
  data: Record<string, unknown>
  title: string
  copyId: string
  onCopy: (text: string, id: string) => void
  isCopied: boolean
}) {
  const jsonStr = JSON.stringify(data, null, 2)

  return (
    <div className="rounded-lg border border-zinc-700/50 bg-zinc-900/80 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700/50 bg-zinc-800/50">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-xs font-medium text-zinc-400">{title}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-zinc-500 hover:text-zinc-300"
          onClick={() => onCopy(jsonStr, copyId)}
        >
          {isCopied ? (
            <Check className="h-3 w-3 text-green-400" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
      <ScrollArea className="max-h-72">
        <pre className="p-3 text-xs font-mono text-zinc-300 leading-relaxed overflow-x-auto">
          <code>{jsonStr}</code>
        </pre>
      </ScrollArea>
    </div>
  )
}

// ─── Parameters Table ────────────────────────────────────────────
function ParametersTable({
  parameters,
}: {
  parameters: ApiEndpoint['parameters']
}) {
  if (parameters.length === 0) return null

  return (
    <div className="mt-4">
      <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Code className="h-3 w-3" />
        Paramètres
      </h4>
      <div className="rounded-lg border border-zinc-700/50 overflow-hidden">
        <div className="grid grid-cols-[minmax(100px,1fr)_minmax(70px,0.7fr)_minmax(50px,0.5fr)_minmax(140px,2fr)] text-xs font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-800/60 px-3 py-2">
          <span>Nom</span>
          <span>Type</span>
          <span className="text-center">Req.</span>
          <span>Description</span>
        </div>
        <div className="divide-y divide-zinc-800/60">
          {parameters.map((param) => (
            <div
              key={param.name}
              className="grid grid-cols-[minmax(100px,1fr)_minmax(70px,0.7fr)_minmax(50px,0.5fr)_minmax(140px,2fr)] text-xs px-3 py-2 hover:bg-zinc-800/30 transition-colors"
            >
              <span className="font-mono text-emerald-400 font-medium">{param.name}</span>
              <span className="text-zinc-500 font-mono">{param.type}</span>
              <span className="text-center">
                {param.required ? (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-red-500/40 text-red-400 bg-red-500/10">
                    oui
                  </Badge>
                ) : (
                  <span className="text-zinc-600">non</span>
                )}
              </span>
              <span className="text-zinc-400">{param.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Try-It Panel ────────────────────────────────────────────────
function TryItPanel({
  endpoint,
  stationId,
  response,
  loading,
  error,
  onTry,
  onCopyResponse,
  copiedResponse,
}: {
  endpoint: ApiEndpoint
  stationId: string
  response: unknown
  loading: boolean
  error: string | null
  onTry: () => void
  onCopyResponse: () => void
  copiedResponse: boolean
}) {
  const isReadOnly =
    endpoint.method === 'GET' || endpoint.method === 'DELETE'
  const canTry = isReadOnly || endpoint.method === 'PUT'

  // Build URL with stationId injected
  const buildUrl = () => {
    const params = endpoint.parameters
      .filter((p) => p.in === 'query' && p.required && p.name === 'stationId')
      .map((p) => `${p.name}=${stationId}`)
      .join('&')

    const hasOtherParams = endpoint.parameters.filter(
      (p) => p.in === 'query' && p.required && p.name !== 'stationId'
    )

    if (params) {
      return `${endpoint.path}?${params}${hasOtherParams.length ? '&...' : ''}`
    }
    return endpoint.path
  }

  return (
    <div className="mt-4 space-y-3">
      <Separator className="bg-zinc-800" />
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
          onClick={onTry}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Play className="h-3 w-3" />
          )}
          {loading ? 'Exécution...' : 'Essayer'}
        </Button>
        {canTry && (
          <span className="text-[10px] text-zinc-600">
            {isReadOnly
              ? '✓ Appel en lecture seule — aucune donnée modifiée'
              : '⚠️ Appel en écriture — effectue une action réelle'}
          </span>
        )}
        {!canTry && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[10px] text-amber-500/70 flex items-center gap-1 cursor-help">
                  <AlertCircle className="h-3 w-3" />
                  POST/PATCH nécessitent un body — utilisez Postman ou curl
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Les méthodes POST et PATCH requièrent un corps de requête JSON.
                Utilisez le body ci-dessus comme exemple.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* URL preview */}
      <div className="flex items-center gap-2 rounded-md bg-zinc-800/60 border border-zinc-700/40 px-3 py-1.5">
        <Terminal className="h-3 w-3 text-zinc-500 shrink-0" />
        <code className="text-[11px] font-mono text-zinc-400 truncate">
          <span className="text-zinc-500">curl </span>
          <span className={methodStyles[endpoint.method]?.text || 'text-zinc-400'}>
            -X {endpoint.method}
          </span>{' '}
          &quot;{buildUrl()}&quot;
        </code>
      </div>

      {/* Response area */}
      <AnimatePresence mode="wait">
        {response && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                <Check className="h-3 w-3 text-green-400" />
                Réponse du serveur
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-2 text-zinc-500 hover:text-zinc-300"
                onClick={onCopyResponse}
              >
                {copiedResponse ? (
                  <Check className="h-2.5 w-2.5 text-green-400" />
                ) : (
                  <Copy className="h-2.5 w-2.5" />
                )}
              </Button>
            </div>
            <div className="rounded-lg border border-green-500/20 bg-zinc-900/80 overflow-hidden">
              <ScrollArea className="max-h-64">
                <pre className="p-3 text-xs font-mono text-green-300/90 leading-relaxed overflow-x-auto">
                  <code>{JSON.stringify(response, null, 2)}</code>
                </pre>
              </ScrollArea>
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-1.5 text-xs text-red-400">
              <AlertCircle className="h-3 w-3" />
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Single Endpoint Card ────────────────────────────────────────
function EndpointCard({
  endpoint,
  stationId,
  isExpanded,
  onToggle,
  copiedId,
  onCopy,
  tryItState,
  onTry,
}: {
  endpoint: ApiEndpoint
  stationId: string
  isExpanded: boolean
  onToggle: () => void
  copiedId: string | null
  onCopy: (text: string, id: string) => void
  tryItState: Record<string, { response: unknown; loading: boolean; error: string | null }>
  onTry: (ep: ApiEndpoint) => void
}) {
  const style = methodStyles[endpoint.method] || methodStyles.GET
  const state = tryItState[endpoint.id] || { response: null, loading: false, error: null }

  return (
    <Card className="border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm overflow-hidden hover:border-zinc-700/60 transition-colors">
      {/* Header — always visible */}
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-zinc-800/20 transition-colors group"
      >
        {/* Method badge */}
        <span
          className={`inline-flex items-center justify-center text-[11px] font-bold tracking-wider px-2.5 py-1 rounded-md border ${style.bg} ${style.text} ${style.border} shrink-0`}
        >
          {endpoint.method}
        </span>

        {/* Path */}
        <code className="text-sm font-mono text-zinc-300 truncate flex-1 group-hover:text-zinc-100 transition-colors">
          {endpoint.path}
        </code>

        {/* Copy URL */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-zinc-600 hover:text-zinc-300 shrink-0"
                onClick={(e) => {
                  e.stopPropagation()
                  onCopy(endpoint.path, `url-${endpoint.id}`)
                }}
              >
                {copiedId === `url-${endpoint.id}` ? (
                  <Check className="h-3 w-3 text-green-400" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copier l&apos;URL</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Expand toggle */}
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4 text-zinc-500 shrink-0" />
        </motion.div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              <Separator className="bg-zinc-800" />

              {/* Description */}
              <p className="text-sm text-zinc-400 leading-relaxed">
                {endpoint.description}
              </p>

              {/* Full URL with stationId */}
              <div className="flex items-center gap-2 rounded-md bg-zinc-800/50 border border-zinc-700/30 px-3 py-2 group/copy">
                <ExternalLink className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                <code className="text-xs font-mono text-zinc-300 flex-1 truncate">
                  {endpoint.path.includes('?')
                    ? `${endpoint.path}&stationId={${stationId}}`
                    : `${endpoint.path}${endpoint.method === 'POST' || endpoint.method === 'PATCH' ? '' : '?stationId={' + stationId + '}'}`}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-zinc-600 hover:text-zinc-300 opacity-0 group-hover/copy:opacity-100 transition-opacity"
                  onClick={() =>
                    onCopy(
                      `${endpoint.path}?stationId=${stationId}`,
                      `full-url-${endpoint.id}`
                    )
                  }
                >
                  {copiedId === `full-url-${endpoint.id}` ? (
                    <Check className="h-3 w-3 text-green-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>

              {/* Parameters table */}
              <ParametersTable parameters={endpoint.parameters} />

              {/* Request body */}
              {endpoint.requestBody && (
                <div>
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Code className="h-3 w-3" />
                    Corps de la requête
                  </h4>
                  <JsonCodeBlock
                    data={endpoint.requestBody}
                    title="Request Body (JSON)"
                    copyId={`req-${endpoint.id}`}
                    onCopy={onCopy}
                    isCopied={copiedId === `req-${endpoint.id}`}
                  />
                </div>
              )}

              {/* Response example */}
              <div>
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Code className="h-3 w-3" />
                  Exemple de réponse
                </h4>
                <JsonCodeBlock
                  data={endpoint.responseExample}
                  title="Response (JSON)"
                  copyId={`res-${endpoint.id}`}
                  onCopy={onCopy}
                  isCopied={copiedId === `res-${endpoint.id}`}
                />
              </div>

              {/* Try it */}
              <TryItPanel
                endpoint={endpoint}
                stationId={stationId}
                response={state.response}
                loading={state.loading}
                error={state.error}
                onTry={() => onTry(endpoint)}
                onCopyResponse={() =>
                  onCopy(
                    JSON.stringify(state.response, null, 2),
                    `live-res-${endpoint.id}`
                  )
                }
                copiedResponse={copiedId === `live-res-${endpoint.id}`}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

// ─── Main Component ─────────────────────────────────────────────
export default function ApiDocumentation({ stationId }: ApiDocumentationProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<string>('auth')
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(new Set())
  const [tryItState, setTryItState] = useState<
    Record<string, { response: unknown; loading: boolean; error: string | null }>
  >({})
  const { copiedId, copy } = useCopyToClipboard()

  // Toggle endpoint expansion
  const toggleEndpoint = (id: string) => {
    setExpandedEndpoints((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Filter endpoints by search
  const getFilteredEndpoints = useCallback(
    (category: string) => {
      let endpoints = apiEndpoints.filter((ep) => ep.category === category)

      if (searchQuery.trim()) {
        const lower = searchQuery.toLowerCase()
        endpoints = endpoints.filter(
          (ep) =>
            ep.path.toLowerCase().includes(lower) ||
            ep.description.toLowerCase().includes(lower) ||
            ep.method.toLowerCase().includes(lower) ||
            ep.parameters.some((p) => p.name.toLowerCase().includes(lower))
        )
      }

      return endpoints
    },
    [searchQuery]
  )

  // Try-it handler
  const handleTry = useCallback(
    async (endpoint: ApiEndpoint) => {
      setTryItState((prev) => ({
        ...prev,
        [endpoint.id]: { response: null, loading: true, error: null },
      }))

      try {
        let url = endpoint.path

        // For query-based endpoints, add required query params
        const queryParams: string[] = []

        if (endpoint.method === 'GET' || endpoint.method === 'DELETE') {
          for (const param of endpoint.parameters) {
            if (param.in === 'query') {
              if (param.name === 'stationId') {
                queryParams.push(`stationId=${stationId}`)
              } else if (param.required) {
                // Skip other required params for safety
                queryParams.push(`${param.name}=demo`)
              }
            }
          }
          if (queryParams.length > 0) {
            url += '?' + queryParams.join('&')
          }
        } else if (endpoint.method === 'PUT') {
          // PUT for schedules bulk update
          const body: Record<string, unknown> = { stationId, action: 'RESET_ALL' }
          const res = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
          const data = await res.json()
          setTryItState((prev) => ({
            ...prev,
            [endpoint.id]: { response: data, loading: false, error: null },
          }))
          return
        }

        const options: RequestInit = {
          method: endpoint.method,
          headers: { 'Content-Type': 'application/json' },
        }

        // Don't send body for GET/DELETE
        if (endpoint.method === 'POST' || endpoint.method === 'PATCH') {
          options.body = JSON.stringify(endpoint.requestBody || {})
        }

        const res = await fetch(url, options)
        const data = await res.json()

        setTryItState((prev) => ({
          ...prev,
          [endpoint.id]: { response: data, loading: false, error: null },
        }))
      } catch (err) {
        setTryItState((prev) => ({
          ...prev,
          [endpoint.id]: {
            response: null,
            loading: false,
            error: err instanceof Error ? err.message : 'Erreur de connexion',
          },
        }))
      }
    },
    [stationId]
  )

  // Count endpoints per category
  const getCategoryCount = (category: string) => {
    return apiEndpoints.filter((ep) => ep.category === category).length
  }

  // Total endpoints
  const totalEndpoints = apiEndpoints.length
  const filteredCount = searchQuery.trim()
    ? apiEndpoints.filter((ep) => {
        const lower = searchQuery.toLowerCase()
        return (
          ep.path.toLowerCase().includes(lower) ||
          ep.description.toLowerCase().includes(lower) ||
          ep.method.toLowerCase().includes(lower)
        )
      }).length
    : totalEndpoints

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <BookOpen className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">
                Documentation API
              </h2>
              <p className="text-xs text-zinc-500">
                {totalEndpoints} endpoints · {apiCategories.length} catégories · v1.0
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Rechercher un endpoint..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-zinc-800/50 border-zinc-700/50 text-sm placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-emerald-500/20"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-zinc-500 hover:text-zinc-300"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Search results indicator */}
        {searchQuery.trim() && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20"
          >
            <Search className="h-3.5 w-3.5 text-emerald-500/70" />
            <span className="text-xs text-emerald-400/80">
              {filteredCount} endpoint{filteredCount !== 1 ? 's' : ''} trouvé
              {filteredCount !== 1 ? 's' : ''} pour &quot;{searchQuery}&quot;
            </span>
          </motion.div>
        )}

        {/* Tabs + Endpoints */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="w-full h-auto flex flex-wrap gap-1 bg-zinc-800/30 border border-zinc-800/60 p-1.5 rounded-xl">
            {apiCategories.map((cat) => {
              const count = getCategoryCount(cat.id)
              const filtered = getFilteredEndpoints(cat.id)
              if (searchQuery.trim() && filtered.length === 0) return null
              return (
                <TabsTrigger
                  key={cat.id}
                  value={cat.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs data-[state=active]:bg-zinc-700/60 data-[state=active]:text-zinc-100 data-[state=active]:shadow-sm rounded-lg transition-all"
                >
                  {categoryIcons[cat.id]}
                  <span className="hidden sm:inline">{cat.label}</span>
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0 h-4 bg-zinc-700/50 text-zinc-500"
                  >
                    {count}
                  </Badge>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {apiCategories.map((cat) => {
            const endpoints = getFilteredEndpoints(cat.id)
            if (searchQuery.trim() && endpoints.length === 0) return null
            return (
              <TabsContent key={cat.id} value={cat.id} className="mt-4">
                {/* Category header */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center justify-center h-7 w-7 rounded-md bg-zinc-800/80 border border-zinc-700/50">
                    {categoryIcons[cat.id]}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-200">
                      {cat.label}
                    </h3>
                    <p className="text-[11px] text-zinc-600">
                      {endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''} dans
                      cette catégorie
                    </p>
                  </div>
                </div>

                {/* Endpoint cards */}
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {endpoints.map((endpoint) => (
                      <motion.div
                        key={endpoint.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                      >
                        <EndpointCard
                          endpoint={endpoint}
                          stationId={stationId}
                          isExpanded={expandedEndpoints.has(endpoint.id)}
                          onToggle={() => toggleEndpoint(endpoint.id)}
                          copiedId={copiedId}
                          onCopy={copy}
                          tryItState={tryItState}
                          onTry={handleTry}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {endpoints.length === 0 && !searchQuery.trim() && (
                  <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
                    <Terminal className="h-8 w-8 mb-2" />
                    <p className="text-sm">Aucun endpoint dans cette catégorie</p>
                  </div>
                )}
              </TabsContent>
            )
          })}
        </Tabs>

        {/* Footer info */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t border-zinc-800/60">
          <div className="flex items-center gap-4 text-[11px] text-zinc-600">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
              GET
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              POST
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
              PATCH
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-purple-500" />
              PUT
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
              DELETE
            </span>
          </div>
          <p className="text-[11px] text-zinc-700">
            SmartTicketQR API v1.0 · Base URL: /api · Format: JSON
          </p>
        </div>
      </div>
    </TooltipProvider>
  )
}
