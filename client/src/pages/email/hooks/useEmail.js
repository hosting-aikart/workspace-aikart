import { useState, useCallback, useRef } from 'react';
import api from '../../../utils/api';

/**
 * useEmail
 *
 * Encapsulates all Gmail API interactions for the Email module.
 * Provides loading states, pagination (nextPageToken), folder switching,
 * message selection, and compose panel state.
 */
export function useEmail() {
  // ── Folder state ────────────────────────────────────────────────────────────
  const [activeFolder, setActiveFolder] = useState('inbox'); // 'inbox' | 'sent' | 'drafts' | 'search'

  // ── Message list ────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState(null);
  const [nextPageToken, setNextPageToken] = useState(null);

  // ── Selected message ────────────────────────────────────────────────────────
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // ── Compose panel ───────────────────────────────────────────────────────────
  const [composeState, setComposeState] = useState(null);
  // composeState shape: { mode: 'compose'|'reply'|'forward', to, subject, body, replyToId, forwardId }

  // ── Search ──────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');

  // ── Action feedback ─────────────────────────────────────────────────────────
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null); // { type: 'success'|'error', text }

  const abortRef = useRef(null);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const showFeedback = useCallback((type, text) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 4000);
  }, []);

  // ── List fetching ────────────────────────────────────────────────────────────

  const fetchList = useCallback(async (folder, pageToken = null, append = false) => {
    setListLoading(true);
    setListError(null);

    const endpoints = {
      inbox: '/email/inbox',
      sent: '/email/sent',
      drafts: '/email/drafts',
    };

    const url = endpoints[folder];
    if (!url) return;

    try {
      const params = pageToken ? { pageToken } : {};
      const { data } = await api.get(url, { params });
      const incoming =
        folder === 'drafts'
          ? (data.data.drafts || [])
          : (data.data.messages || []);

      setMessages((prev) => (append ? [...prev, ...incoming] : incoming));
      setNextPageToken(data.data.nextPageToken || null);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load emails.';
      setListError(msg);
    } finally {
      setListLoading(false);
    }
  }, []);

  const fetchSearch = useCallback(async (q, pageToken = null, append = false) => {
    if (!q?.trim()) return;
    setListLoading(true);
    setListError(null);
    try {
      const params = { q };
      if (pageToken) params.pageToken = pageToken;
      const { data } = await api.get('/email/search', { params });
      const incoming = data.data.messages || [];
      setMessages((prev) => (append ? [...prev, ...incoming] : incoming));
      setNextPageToken(data.data.nextPageToken || null);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Search failed.';
      setListError(msg);
    } finally {
      setListLoading(false);
    }
  }, []);

  // ── Change folder ────────────────────────────────────────────────────────────

  const openFolder = useCallback((folder) => {
    setActiveFolder(folder);
    setSelectedMessage(null);
    setSearchQuery('');
    setMessages([]);
    setNextPageToken(null);
    fetchList(folder);
  }, [fetchList]);

  // ── Select a message ─────────────────────────────────────────────────────────

  const openMessage = useCallback(async (messageId) => {
    setDetailLoading(true);
    setDetailError(null);
    setSelectedMessage(null);
    try {
      const { data } = await api.get(`/email/${messageId}`);
      setSelectedMessage(data.data);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load message.';
      setDetailError(msg);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeMessage = useCallback(() => {
    setSelectedMessage(null);
  }, []);

  // ── Load more (pagination) ───────────────────────────────────────────────────

  const loadMore = useCallback(() => {
    if (!nextPageToken || listLoading) return;
    if (activeFolder === 'search') {
      fetchSearch(searchQuery, nextPageToken, true);
    } else {
      fetchList(activeFolder, nextPageToken, true);
    }
  }, [nextPageToken, listLoading, activeFolder, searchQuery, fetchSearch, fetchList]);

  // ── Search ───────────────────────────────────────────────────────────────────

  const runSearch = useCallback((q) => {
    setSearchQuery(q);
    setActiveFolder('search');
    setSelectedMessage(null);
    setMessages([]);
    setNextPageToken(null);
    if (q.trim()) fetchSearch(q);
  }, [fetchSearch]);

  // ── Compose helpers ──────────────────────────────────────────────────────────

  const openCompose = useCallback(() => {
    setComposeState({ mode: 'compose', to: '', subject: '', body: '' });
  }, []);

  const openReply = useCallback((message) => {
    setComposeState({
      mode: 'reply',
      to: message.from,
      subject: message.subject.startsWith('Re:') ? message.subject : `Re: ${message.subject}`,
      body: '',
      replyToId: message.id,
    });
  }, []);

  const openForward = useCallback((message) => {
    setComposeState({
      mode: 'forward',
      to: '',
      subject: message.subject.startsWith('Fwd:') ? message.subject : `Fwd: ${message.subject}`,
      body: '',
      forwardId: message.id,
    });
  }, []);

  const closeCompose = useCallback(() => setComposeState(null), []);

  // ── Send ─────────────────────────────────────────────────────────────────────

  const sendEmail = useCallback(async ({ to, cc, bcc, subject, body, files }) => {
    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('to', to);
      if (cc) formData.append('cc', cc);
      if (bcc) formData.append('bcc', bcc);
      formData.append('subject', subject || '');
      formData.append('body', body || '');
      for (const f of (files || [])) formData.append('files', f);

      await api.post('/email/send', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showFeedback('success', 'Email sent successfully!');
      setComposeState(null);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to send email.';
      showFeedback('error', msg);
    } finally {
      setActionLoading(false);
    }
  }, [showFeedback]);

  const replyEmail = useCallback(async (messageId, { body, files }) => {
    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('body', body || '');
      for (const f of (files || [])) formData.append('files', f);

      await api.post(`/email/reply/${messageId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showFeedback('success', 'Reply sent!');
      setComposeState(null);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to send reply.';
      showFeedback('error', msg);
    } finally {
      setActionLoading(false);
    }
  }, [showFeedback]);

  const forwardEmail = useCallback(async (messageId, { to, body, files }) => {
    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('to', to);
      formData.append('body', body || '');
      for (const f of (files || [])) formData.append('files', f);

      await api.post(`/email/forward/${messageId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showFeedback('success', 'Email forwarded!');
      setComposeState(null);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to forward email.';
      showFeedback('error', msg);
    } finally {
      setActionLoading(false);
    }
  }, [showFeedback]);

  const saveDraft = useCallback(async ({ draftId, to, cc, bcc, subject, body, files }) => {
    setActionLoading(true);
    try {
      const formData = new FormData();
      if (draftId) formData.append('draftId', draftId);
      if (to) formData.append('to', to);
      if (cc) formData.append('cc', cc);
      if (bcc) formData.append('bcc', bcc);
      if (subject) formData.append('subject', subject);
      if (body) formData.append('body', body);
      for (const f of (files || [])) formData.append('files', f);

      const { data } = await api.post('/email/draft', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showFeedback('success', 'Draft saved.');
      return data.data.draftId;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save draft.';
      showFeedback('error', msg);
    } finally {
      setActionLoading(false);
    }
  }, [showFeedback]);

  return {
    // folder
    activeFolder, openFolder,
    // list
    messages, listLoading, listError, nextPageToken, loadMore,
    // detail
    selectedMessage, detailLoading, detailError, openMessage, closeMessage,
    // compose
    composeState, openCompose, openReply, openForward, closeCompose,
    // search
    searchQuery, runSearch,
    // actions
    actionLoading, actionMessage, sendEmail, replyEmail, forwardEmail, saveDraft,
    // initial load helper (called by EmailLayout on mount)
    fetchList,
    abortRef,
  };
}
