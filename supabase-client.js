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

  const uploadImage = async (file, folder = 'news') => {
    if (!file) return null;
    if (!['news', 'gallery', 'slides', 'team'].includes(folder)) {
      throw new Error('Invalid image folder.');
    }
    const supabase = getClient();
    const fileName = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
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
      if (url.origin !== new URL(config.url).origin) return;
      const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
      const pathStart = url.pathname.indexOf(marker);
      if (pathStart < 0) return;
      const path = decodeURIComponent(url.pathname.slice(pathStart + marker.length));
      if (!path) return;
      const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);
      if (error) console.error('Unable to remove managed image:', error);
    } catch (error) {
      console.error('Unable to remove managed image:', error);
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

  const managedCollections = {
    gallery: { table: 'gallery_projects', folder: 'gallery', fields: ['title', 'category', 'order_index'] },
    slides: { table: 'hero_slides', folder: 'slides', fields: ['alt_text', 'order_index'] },
    team: { table: 'team', folder: 'team', fields: ['name', 'role', 'bio', 'order_index'] }
  };

  const getManagedCollection = collection => {
    const definition = managedCollections[collection];
    if (!definition) throw new Error('Unknown content collection.');
    return definition;
  };

  const listManagedContent = async collection => {
    const { table } = getManagedCollection(collection);
    const { data, error } = await getClient()
      .from(table)
      .select('*')
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  };

  const saveManagedContent = async (collection, id, values, imageFile) => {
    const definition = getManagedCollection(collection);
    const supabase = getClient();
    const payload = {};
    definition.fields.forEach(field => {
      if (Object.hasOwn(values, field)) payload[field] = values[field];
    });

    let existingImageUrl = '';
    if (id) {
      const { data: existing, error } = await supabase
        .from(definition.table)
        .select('image_url')
        .eq('id', id)
        .single();
      if (error) throw error;
      existingImageUrl = existing.image_url || '';
    }

    const newImageUrl = imageFile ? await uploadImage(imageFile, definition.folder) : '';
    const imageUrl = newImageUrl || existingImageUrl;
    if (!imageUrl) throw new Error('Choose an image before saving this item.');
    payload.image_url = imageUrl;

    const result = id
      ? await supabase.from(definition.table).update(payload).eq('id', id).select().single()
      : await supabase.from(definition.table).insert(payload).select().single();
    if (result.error) {
      if (newImageUrl) await removeImage(newImageUrl);
      throw result.error;
    }
    if (newImageUrl && existingImageUrl && existingImageUrl !== newImageUrl) {
      await removeImage(existingImageUrl);
    }
    return result.data;
  };

  const deleteManagedContent = async (collection, id) => {
    const { table } = getManagedCollection(collection);
    const { data, error } = await getClient()
      .from(table)
      .delete()
      .eq('id', id)
      .select('image_url')
      .single();
    if (error) throw error;
    await removeImage(data.image_url);
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
    listManagedContent,
    saveManagedContent,
    deleteManagedContent,
        fetchInquiries,
    deleteInquiry,
    deleteAllInquiries,
    checkAdminStatus,
    adminLogin,
    submitInquiry
  };
})();
