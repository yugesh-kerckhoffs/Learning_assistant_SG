import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { externalSupabase } from '@/lib/externalSupabase';

interface MediaItem {
  id: string;
  prompt: string;
  created_at: string;
  mime_type: string | null;
}

const GalleryPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { showNotification } = useApp();
  const [images, setImages] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedImages, setLoadedImages] = useState<Record<string, { data: string; mime: string }>>({});
  const [loadingItem, setLoadingItem] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }
    fetchMedia();
  }, [currentUser]);

  const fetchMedia = async () => {
    try {
      const imgRes = await externalSupabase
        .from('generated_images')
        .select('id, prompt, created_at, mime_type')
        .eq('user_id', currentUser!.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (imgRes.data) setImages(imgRes.data);
    } catch (e) {
      console.error('Gallery fetch error:', e);
    }
    setLoading(false);
  };

  const loadImage = async (id: string) => {
    if (loadedImages[id]) return;
    setLoadingItem(id);
    try {
      const { data, error } = await externalSupabase.from('generated_images').select('image_data, mime_type, prompt').eq('id', id).single();
      if (error) throw error;
      if (data?.image_data) {
        setLoadedImages(prev => ({ ...prev, [id]: { data: data.image_data, mime: data.mime_type || 'image/png' } }));
      } else {
        showNotification('❌ Image data not found');
      }
    } catch { showNotification('❌ Error loading image'); }
    setLoadingItem(null);
  };

  const downloadFile = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('📥 Downloaded!');
  };

  if (!currentUser?.id) {
    return (
      <div className="gallery-page" style={{ justifyContent: 'center', textAlign: 'center' }}>
        <h2 style={{ color: '#4fc3f7', fontSize: '2em', marginBottom: '20px' }}>🖼️ My Gallery</h2>
        <p style={{ color: 'rgba(255,255,255,0.8)' }}>⚠️ Please sign in to view your saved media!</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="gallery-page" style={{ justifyContent: 'center', textAlign: 'center' }}>
        <h2 style={{ color: '#4fc3f7', fontSize: '2em', marginBottom: '20px' }}>🖼️ My Gallery</h2>
        <p style={{ color: 'rgba(255,255,255,0.8)' }}>Loading your media... ⏳</p>
      </div>
    );
  }

  return (
    <div className="gallery-page">
      <h2 style={{ color: '#4fc3f7', fontSize: '2em', marginBottom: '10px', textAlign: 'center' }}>🖼️ My Gallery</h2>
      <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '20px', textAlign: 'center' }}>Click on any image to load and view it</p>

      <h3 style={{ color: '#fff', marginBottom: '15px' }}>📸 Your Saved Images</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
        {images.length > 0 ? images.map(img => (
          <div key={img.id} style={{ border: '2px solid rgba(255,255,255,0.3)', borderRadius: '10px', padding: '10px', background: 'rgba(255,255,255,0.1)' }}>
            {loadedImages[img.id] ? (
              <>
                <img src={`data:${loadedImages[img.id].mime};base64,${loadedImages[img.id].data}`} alt={img.prompt} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }} />
                <p style={{ fontSize: '0.8em', margin: '5px 0', color: 'rgba(255,255,255,0.9)' }}>{img.prompt.substring(0, 40)}...</p>
                <button onClick={() => downloadFile(`data:${loadedImages[img.id].mime};base64,${loadedImages[img.id].data}`, `image-${img.id}.png`)} style={{ background: '#4fc3f7', border: 'none', padding: '5px 10px', borderRadius: '5px', color: 'white', cursor: 'pointer', fontSize: '0.8em', width: '100%' }}>📥 Download</button>
              </>
            ) : (
              <>
                <div style={{ width: '100%', height: '150px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }} onClick={() => loadImage(img.id)}>
                  {loadingItem === img.id ? '⏳ Loading...' : '👁️ Click to View'}
                </div>
                <p style={{ fontSize: '0.8em', margin: '5px 0', color: 'rgba(255,255,255,0.9)' }}>{img.prompt.substring(0, 40)}...</p>
                <small style={{ color: 'rgba(255,255,255,0.5)' }}>{new Date(img.created_at).toLocaleDateString()}</small>
              </>
            )}
          </div>
        )) : (
          <p style={{ color: 'rgba(255,255,255,0.7)' }}>No saved images yet. Generate some images to see them here! 🎨</p>
        )}
      </div>
    </div>
  );
};

export default GalleryPage;
