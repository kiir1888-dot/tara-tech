(() => {
  const config = window.TARA_SUPABASE;
  const STORAGE_BUCKET = 'website-assets';

  const configured = config
    && config.url
    && config.url.startsWith('https://')
    && !config.url.includes('YOUR_')
    && config.anonKey
    && !config.anonKey.includes('YOUR_');

  let client = null;
  if (configured && window.supabase) {
    client = window.supabase.createClient(config.url, config.anonKey);
  }

  const getClient = () => {
    if (!client) throw new Error('Supabase client is not configured. Check supabase-config.js');
    return client;
  };

  const uploadImage = async (file) => {
    if (!file) return null;
    const supabase = getClient();
    const fileName = `news/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file, { upsert: false });
    if (error) throw error;
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  const removeImage = async (imageUrl) => {
    if (!imageUrl) return;
    try {
      const supabase = getClient();
      const url = new URL(imageUrl);
      const path = url.pathname.split('/').slice(-2).join('/');
      if (path) await supabase.storage.from(STORAGE_BUCKET).remove([path]);
    } catch {
      // Ignore cleanup errors
    }
  };

  // ── News ─────────────────────────────────────────────────────────

    const postNews = async (title, content, imageFile, category = 'Tech') => {
    const supabase = getClient();
    let imageUrl = null;
    if (imageFile) imageUrl = await uploadImage(imageFile);
    const slug = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const { data, error } = await supabase
      .from('news')
      .insert({ title, slug, content, image_url: imageUrl, category })
      .select()
      .single();
    if (error) throw error;
    return data;
  };

  const updateNews = async (id, title, content, imageFile) => {
    const supabase = getClient();
    const updates = { title, content };
    if (imageFile) {
      const { data: existing } = await supabase.from('news').select('image_url').eq('id', id).single();
      if (existing?.image_url) await removeImage(existing.image_url);
      updates.image_url = await uploadImage(imageFile);
    }
    const { data, error } = await supabase
      .from('news')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  };

  const deleteNews = async (id) => {
    const supabase = getClient();
    const { data: existing } = await supabase.from('news').select('image_url').eq('id', id).single();
    if (existing?.image_url) await removeImage(existing.image_url);
    const { error } = await supabase.from('news').delete().eq('id', id);
    if (error) throw error;
  };

  // ── Events ───────────────────────────────────────────────────────

  const createEvent = async (title, description, eventDate, location, imageFile) => {
    const supabase = getClient();
    let imageUrl = null;
    if (imageFile) imageUrl = await uploadImage(imageFile);
    const { data, error } = await supabase
      .from('events')
      .insert({ title, description, event_date: eventDate, location, image_url: imageUrl })
      .select()
      .single();
    if (error) throw error;
    return data;
  };

  const updateEvent = async (id, details, imageFile) => {
    const supabase = getClient();
    const updates = {
      title: details.title,
      description: details.description,
      event_date: details.date,
      location: details.location
    };
    if (imageFile) {
      const { data: existing } = await supabase.from('events').select('image_url').eq('id', id).single();
      if (existing?.image_url) await removeImage(existing.image_url);
      updates.image_url = await uploadImage(imageFile);
    }
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  };

  const deleteEvent = async (id) => {
    const supabase = getClient();
    const { data: existing } = await supabase.from('events').select('image_url').eq('id', id).single();
    if (existing?.image_url) await removeImage(existing.image_url);
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) throw error;
  };

  // ── Inquiries ────────────────────────────────────────────────────

  const submitInquiry = async (name, email, phone, message, eventTitle = null) => {
      const supabase = getClient();
          const payload = { name, email, phone, message };
    if (eventTitle) payload.event_title = eventTitle;
    const { data, error } = await supabase
      .from('contact_inquiries')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  };

  // ── Inquiries (continued) ────────────────────────────────────────

  const fetchInquiries = async () => {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('contact_inquiries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data || [];
  };

  const deleteInquiry = async (id) => {
    const supabase = getClient();
    const { error } = await supabase.from('contact_inquiries').delete().eq('id', id);
    if (error) throw error;
  };

  const deleteAllInquiries = async () => {
    const supabase = getClient();
    const { error } = await supabase.from('contact_inquiries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
  };

  // ── Auth ─────────────────────────────────────────────────────────

  const checkAdminStatus = async () => {
    const supabase = getClient();
    const { data, error } = await supabase.rpc('is_admin');
    if (error) throw error;
    return data === true;
  };

  const adminLogin = async (email, password) => {
    const supabase = getClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  };

  // ── Expose ───────────────────────────────────────────────────────

  window.TaraSupabaseAPI = {
    configured,
    client,
    postNews,
    updateNews,
    deleteNews,
    createEvent,
    updateEvent,
    deleteEvent,
        fetchInquiries,
    deleteInquiry,
    deleteAllInquiries,
    checkAdminStatus,
    adminLogin,
    submitInquiry
  };
})();
