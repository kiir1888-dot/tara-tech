(() => {
  const BUCKET = 'website-assets';
  const config = window.TARA_SUPABASE;
  const configured = Boolean(
    window.supabase
    && config?.url?.startsWith('https://')
    && !config.url.includes('YOUR_')
    && config.anonKey
    && !config.anonKey.includes('YOUR_')
  );
  const client = configured
    ? window.supabase.createClient(config.url, config.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
    : null;

  const requireClient = () => {
    if (!client) throw new Error('Supabase is not configured. Update supabase-config.js.');
    return client;
  };
  const slugify = value => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const throwIfError = (error, fallback) => {
    if (error) throw new Error(error.message || fallback);
  };
  const getStoragePath = publicUrl => {
    if (!publicUrl) return null;
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const index = publicUrl.indexOf(marker);
    return index === -1 ? null : decodeURIComponent(publicUrl.slice(index + marker.length));
  };

  const uploadImage = async (imageFile, folder) => {
    if (!imageFile) return null;
    try {
      const extension = (imageFile.name?.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const path = `${folder}/${crypto.randomUUID()}.${extension}`;
      const supabase = requireClient();
      const { error } = await supabase.storage.from(BUCKET).upload(path, imageFile, {
        cacheControl: '3600', contentType: imageFile.type, upsert: false
      });
      throwIfError(error, 'Unable to upload image.');
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      if (!data?.publicUrl) throw new Error('Supabase did not return a public image URL.');
      return { path, publicUrl: data.publicUrl };
    } catch (error) {
      throw new Error(`Image upload failed: ${error.message}`);
    }
  };

  const removeImage = async publicUrl => {
    const path = getStoragePath(publicUrl);
    if (!path) return;
    try {
      const { error } = await requireClient().storage.from(BUCKET).remove([path]);
      throwIfError(error, 'Unable to delete image.');
    } catch (error) {
      throw new Error(`Image deletion failed: ${error.message}`);
    }
  };
  const replaceImage = async (currentUrl, newImageFile, folder) => {
    if (!newImageFile) return { imageUrl: currentUrl || null, uploadedUrl: null };
    const uploaded = await uploadImage(newImageFile, folder);
    return { imageUrl: uploaded.publicUrl, uploadedUrl: uploaded.publicUrl };
  };
  const rollbackUpload = async publicUrl => {
    if (!publicUrl) return;
    try { await removeImage(publicUrl); } catch (error) { console.error(error); }
  };
  const cleanupOldImage = async publicUrl => {
    if (!publicUrl) return;
    try { await removeImage(publicUrl); } catch (error) { console.warn(error); }
  };

  const adminLogin = async (email, password) => {
    try {
      const { data, error } = await requireClient().auth.signInWithPassword({ email, password });
      throwIfError(error, 'Unable to sign in.');
      if (!data.user) throw new Error('Sign-in completed without a user.');
      return data.user;
    } catch (error) {
      throw new Error(`Admin sign-in failed: ${error.message}`);
    }
  };

  const checkAdminStatus = async () => {
    try {
      const supabase = requireClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      throwIfError(userError, 'Unable to read the current user.');
      if (!userData.user) return false;
      const { data, error } = await supabase.from('profiles').select('role').eq('id', userData.user.id).maybeSingle();
      throwIfError(error, 'Unable to verify administrator access.');
      return data?.role === 'admin';
    } catch (error) {
      throw new Error(`Admin verification failed: ${error.message}`);
    }
  };

  const postNews = async (title, content, imageFile) => {
    let uploadedUrl = null;
    try {
      const supabase = requireClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      throwIfError(userError, 'Unable to identify the current user.');
      if (!userData.user) throw new Error('Authentication is required.');
      const uploaded = await uploadImage(imageFile, 'news');
      uploadedUrl = uploaded?.publicUrl || null;
      const { data, error } = await supabase.from('news').insert({
        title: title.trim(), slug: slugify(title), content: content.trim(), image_url: uploadedUrl,
        created_by: userData.user.id
      }).select().single();
      throwIfError(error, 'Unable to create news.');
      return data;
    } catch (error) {
      await rollbackUpload(uploadedUrl);
      throw new Error(`News creation failed: ${error.message}`);
    }
  };

  const updateNews = async (id, title, content, newImageFile) => {
    let uploadedUrl = null;
    try {
      const supabase = requireClient();
      const { data: existing, error: readError } = await supabase.from('news').select('image_url').eq('id', id).single();
      throwIfError(readError, 'Unable to find news.');
      const replacement = await replaceImage(existing.image_url, newImageFile, 'news');
      uploadedUrl = replacement.uploadedUrl;
      const { data, error } = await supabase.from('news').update({
        title: title.trim(), slug: slugify(title), content: content.trim(), image_url: replacement.imageUrl
      }).eq('id', id).select().single();
      throwIfError(error, 'Unable to update news.');
      if (uploadedUrl) await cleanupOldImage(existing.image_url);
      uploadedUrl = null;
      return data;
    } catch (error) {
      await rollbackUpload(uploadedUrl);
      throw new Error(`News update failed: ${error.message}`);
    }
  };

  const deleteNews = async id => {
    try {
      const supabase = requireClient();
      const { data: existing, error: readError } = await supabase.from('news').select('image_url').eq('id', id).single();
      throwIfError(readError, 'Unable to find news.');
      const { error } = await supabase.from('news').delete().eq('id', id);
      throwIfError(error, 'Unable to delete news.');
      await cleanupOldImage(existing.image_url);
      return true;
    } catch (error) {
      throw new Error(`News deletion failed: ${error.message}`);
    }
  };

  const createEvent = async (title, description, date, location, imageFile) => {
    let uploadedUrl = null;
    try {
      const uploaded = await uploadImage(imageFile, 'events');
      uploadedUrl = uploaded?.publicUrl || null;
      const { data, error } = await requireClient().from('events').insert({
        title: title.trim(), description: description.trim(), event_date: new Date(date).toISOString(),
        location: location.trim(), image_url: uploadedUrl
      }).select().single();
      throwIfError(error, 'Unable to create event.');
      return data;
    } catch (error) {
      await rollbackUpload(uploadedUrl);
      throw new Error(`Event creation failed: ${error.message}`);
    }
  };

  const updateEvent = async (id, details, newImageFile) => {
    let uploadedUrl = null;
    try {
      const supabase = requireClient();
      const { data: existing, error: readError } = await supabase.from('events').select('image_url').eq('id', id).single();
      throwIfError(readError, 'Unable to find event.');
      const replacement = await replaceImage(existing.image_url, newImageFile, 'events');
      uploadedUrl = replacement.uploadedUrl;
      const { data, error } = await supabase.from('events').update({
        title: details.title.trim(), description: details.description.trim(),
        event_date: new Date(details.date || details.event_date).toISOString(),
        location: details.location.trim(), image_url: replacement.imageUrl
      }).eq('id', id).select().single();
      throwIfError(error, 'Unable to update event.');
      if (uploadedUrl) await cleanupOldImage(existing.image_url);
      uploadedUrl = null;
      return data;
    } catch (error) {
      await rollbackUpload(uploadedUrl);
      throw new Error(`Event update failed: ${error.message}`);
    }
  };

  const deleteEvent = async id => {
    try {
      const supabase = requireClient();
      const { data: existing, error: readError } = await supabase.from('events').select('image_url').eq('id', id).single();
      throwIfError(readError, 'Unable to find event.');
      const { error } = await supabase.from('events').delete().eq('id', id);
      throwIfError(error, 'Unable to delete event.');
      await cleanupOldImage(existing.image_url);
      return true;
    } catch (error) {
      throw new Error(`Event deletion failed: ${error.message}`);
    }
  };

  const addTeamMember = async (name, role, bio, imageFile) => {
    let uploadedUrl = null;
    try {
      const uploaded = await uploadImage(imageFile, 'team');
      uploadedUrl = uploaded?.publicUrl || null;
      const { data, error } = await requireClient().from('team').insert({
        name: name.trim(), role: role.trim(), bio: bio.trim(), image_url: uploadedUrl
      }).select().single();
      throwIfError(error, 'Unable to add team member.');
      return data;
    } catch (error) {
      await rollbackUpload(uploadedUrl);
      throw new Error(`Team member creation failed: ${error.message}`);
    }
  };

  const updateTeamMember = async (id, details, newImageFile) => {
    let uploadedUrl = null;
    try {
      const supabase = requireClient();
      const { data: existing, error: readError } = await supabase.from('team').select('image_url').eq('id', id).single();
      throwIfError(readError, 'Unable to find team member.');
      const replacement = await replaceImage(existing.image_url, newImageFile, 'team');
      uploadedUrl = replacement.uploadedUrl;
      const { data, error } = await supabase.from('team').update({
        name: details.name.trim(), role: details.role.trim(), bio: details.bio.trim(),
        order_index: details.order_index ?? 0, image_url: replacement.imageUrl
      }).eq('id', id).select().single();
      throwIfError(error, 'Unable to update team member.');
      if (uploadedUrl) await cleanupOldImage(existing.image_url);
      uploadedUrl = null;
      return data;
    } catch (error) {
      await rollbackUpload(uploadedUrl);
      throw new Error(`Team member update failed: ${error.message}`);
    }
  };

  const deleteTeamMember = async id => {
    try {
      const supabase = requireClient();
      const { data: existing, error: readError } = await supabase.from('team').select('image_url').eq('id', id).single();
      throwIfError(readError, 'Unable to find team member.');
      const { error } = await supabase.from('team').delete().eq('id', id);
      throwIfError(error, 'Unable to delete team member.');
      await cleanupOldImage(existing.image_url);
      return true;
    } catch (error) {
      throw new Error(`Team member deletion failed: ${error.message}`);
    }
  };

  const submitInquiry = async (name, email, phone, message) => {
    try {
      const { error } = await requireClient().from('contact_inquiries').insert({
        name: name.trim(), email: email.trim().toLowerCase(), phone: phone?.trim() || null, message: message.trim()
      });
      throwIfError(error, 'Unable to submit inquiry.');
      return true;
    } catch (error) {
      throw new Error(`Inquiry submission failed: ${error.message}`);
    }
  };

  const fetchInquiries = async () => {
    try {
      const { data, error } = await requireClient().from('contact_inquiries').select('*').order('created_at', { ascending: false });
      throwIfError(error, 'Unable to load inquiries.');
      return data;
    } catch (error) {
      throw new Error(`Inquiry loading failed: ${error.message}`);
    }
  };

  window.TaraSupabaseAPI = Object.freeze({
    client, configured, adminLogin, checkAdminStatus,
    postNews, updateNews, deleteNews,
    createEvent, updateEvent, deleteEvent,
    addTeamMember, updateTeamMember, deleteTeamMember,
    submitInquiry, fetchInquiries
  });
})();
