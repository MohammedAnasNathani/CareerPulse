import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Heart, MessageCircle, MapPin, Link as LinkIcon, Calendar, Upload } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { getInitials, renderHashtags } from './FeedHelpers';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Profile({ user, onLogout, token, refreshUser }) {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ bio: '', headline: '', location: '', website: '' });
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    fetchProfile();
    fetchUserPosts();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfileUser(response.data);
      setFormData({
        bio: response.data.bio || '',
        headline: response.data.headline || '',
        location: response.data.location || '',
        website: response.data.website || ''
      });
    } catch (error) {
      toast.error('Failed to load profile');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    try {
      const response = await axios.get(`${API}/posts/user/${userId}`);
      setPosts(response.data);
    } catch (error) {
      toast.error('Failed to load posts');
    }
  };

  const handleUpdateProfile = async () => {
    try {
      await axios.put(
        `${API}/auth/profile`,
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      setProfileUser(prev => ({
        ...prev,
        ...formData
      }));
      
      setIsEditing(false);
      toast.success('Profile updated!');
      
      if (refreshUser) {
        refreshUser();
      }
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const handleFollow = async () => {
    try {
      const wasFollowing = isFollowing;
      setProfileUser(prev => ({
        ...prev,
        followers: wasFollowing 
          ? prev.followers.filter(id => id !== user.id)
          : [...(prev.followers || []), user.id]
      }));
      
      if (user) {
        if (wasFollowing) {
          user.following = user.following.filter(id => id !== userId);
        } else {
          user.following = [...(user.following || []), userId];
        }
      }
      
      await axios.post(`${API}/users/${userId}/follow`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(wasFollowing ? 'Unfollowed' : 'Following!');
      
      setTimeout(() => fetchProfile(), 500);
    } catch (error) {
      toast.error('Failed to update follow status');
      fetchProfile();
    }
  };

  const handleImageUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Max 5MB');
      return;
    }

    type === 'avatar' ? setUploadingAvatar(true) : setUploadingCover(true);
    
    try {
      const fd = new FormData();
      fd.append('file', file);
      
      const uploadRes = await axios.post(`${API}/upload`, fd, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const imageUrl = uploadRes.data.image;
      
      if (!imageUrl) {
        throw new Error('No image URL returned from upload');
      }
      
      const field = type === 'avatar' ? 'avatar' : 'cover_image';
      
      await axios.put(
        `${API}/auth/profile`,
        { [field]: imageUrl },
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const updatedProfile = {
        ...profileUser,
        [field]: imageUrl
      };
      setProfileUser(updatedProfile);
      
      if (refreshUser) {
        await refreshUser();
      }
      
      toast.success(`${type === 'avatar' ? 'Avatar' : 'Cover'} updated!`);
      
    } catch (error) {
      toast.error(`Upload failed: ${error.response?.data?.detail || error.message}`);
      fetchProfile();
    } finally {
      type === 'avatar' ? setUploadingAvatar(false) : setUploadingCover(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#f3f2ef' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#0a66c2' }}></div>
      </div>
    );
  }

  const isFollowing = user?.following?.includes(userId);

  return (
    <div className="min-h-screen" style={{ background: '#f3f2ef' }}>
      <nav className="navbar sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:text-blue-600 font-medium"
            data-testid="back-to-feed-button"
          >
            <ArrowLeft size={20} />
            <span>Back to Feed</span>
          </button>
          <h1 className="text-2xl font-bold" style={{ color: '#0a66c2' }}>CareerPulse</h1>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="premium-card rounded-xl overflow-hidden fade-in" data-testid="profile-container">
          {/* Cover Image */}
          <div className="relative h-48" style={{ background: profileUser?.cover_image ? `url(${profileUser.cover_image}) center/cover` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            {isOwnProfile && (
              <>
                <button
                  onClick={() => document.getElementById('cover-upload-input').click()}
                  disabled={uploadingCover}
                  className="absolute bottom-4 right-4 flex items-center gap-2"
                  style={{
                    backgroundColor: '#0a66c2',
                    color: 'white',
                    padding: '0.75rem 1.25rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    cursor: uploadingCover ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    zIndex: 10,
                    pointerEvents: 'auto',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!uploadingCover) {
                      e.target.style.backgroundColor = '#084a8f';
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#0a66c2';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                  }}
                >
                  {uploadingCover ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Upload size={18} />
                      <span>Update Cover</span>
                    </>
                  )}
                </button>
                <input
                  id="cover-upload-input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'cover')}
                  style={{ display: 'none' }}
                />
              </>
            )}
          </div>

          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-16 relative">
              {/* Avatar */}
              <div className="relative">
                {profileUser?.avatar ? (
                  <img
                    src={profileUser.avatar}
                    alt={profileUser.name}
                    className="avatar-xl"
                    style={{ border: '4px solid white' }}
                    data-testid="profile-avatar"
                  />
                ) : (
                  <div className="avatar-xl" style={{ border: '4px solid white' }} data-testid="profile-avatar-initials">
                    {getInitials(profileUser?.name)}
                  </div>
                )}
                {isOwnProfile && (
                  <label className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-md cursor-pointer hover:bg-gray-100">
                    {uploadingAvatar ? <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: '#0a66c2' }}></div> : <Edit2 size={16} />}
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'avatar')} className="hidden" />
                  </label>
                )}
              </div>

              <div className="flex-1 sm:mb-2">
                <h2 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }} data-testid="profile-name">
                  {profileUser?.name}
                </h2>
                <p className="text-lg mt-1" style={{ color: 'var(--text-secondary)' }} data-testid="profile-headline">
                  {profileUser?.headline || 'Professional'}
                </p>
              </div>

              <div className="flex gap-2">
                {isOwnProfile ? (
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="btn-primary flex items-center gap-2"
                    data-testid="edit-profile-button"
                  >
                    <Edit2 size={18} />
                    Edit Profile
                  </button>
                ) : (
                  <button
                    onClick={handleFollow}
                    className={isFollowing ? 'btn-secondary' : 'btn-primary'}
                    data-testid="follow-button"
                  >
                    {isFollowing ? 'Unfollow' : 'Follow'}
                  </button>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-6 mt-6 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="text-center">
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {profileUser?.followers?.length || 0}
                </p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Followers</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {profileUser?.following?.length || 0}
                </p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Following</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {posts.length}
                </p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Posts</p>
              </div>
            </div>

            {/* Profile Info */}
            <div className="mt-6">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Headline</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Your professional headline"
                      value={formData.headline}
                      onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                      data-testid="profile-headline-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Bio</label>
                    <textarea
                      className="textarea-field"
                      placeholder="Tell us about yourself..."
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      data-testid="profile-bio-textarea"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Location</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="City, Country"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        data-testid="profile-location-input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Website</label>
                      <input
                        type="url"
                        className="input-field"
                        placeholder="https://yoursite.com"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        data-testid="profile-website-input"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdateProfile}
                      className="btn-primary"
                      data-testid="save-profile-button"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setFormData({
                          bio: profileUser?.bio || '',
                          headline: profileUser?.headline || '',
                          location: profileUser?.location || '',
                          website: profileUser?.website || ''
                        });
                      }}
                      className="btn-secondary"
                      data-testid="cancel-edit-button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {profileUser?.bio && (
                    <p className="text-base leading-relaxed" style={{ color: 'var(--text-primary)' }} data-testid="profile-bio">
                      {profileUser.bio}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-4 mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {profileUser?.location && (
                      <div className="flex items-center gap-2">
                        <MapPin size={16} />
                        <span>{profileUser.location}</span>
                      </div>
                    )}
                    {profileUser?.website && (
                      <div className="flex items-center gap-2">
                        <LinkIcon size={16} />
                        <a href={profileUser.website} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                          {profileUser.website}
                        </a>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      <span>Joined {format(new Date(profileUser?.created_at), 'MMMM yyyy')}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Posts Section */}
        <div className="mt-8">
          <h3 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }} data-testid="posts-section-title">
            Posts & Activity
          </h3>

          <div className="space-y-4" data-testid="user-posts-container">
            {posts.length === 0 ? (
              <div className="premium-card p-12 text-center">
                <p style={{ color: 'var(--text-secondary)' }}>No posts yet.</p>
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="post-card p-6 fade-in" data-testid={`user-post-${post.id}`}>
                  <div className="flex items-start gap-3">
                    {post.user_avatar ? (
                      <img src={post.user_avatar} alt={post.user_name} className="avatar" />
                    ) : (
                      <div className="avatar">{getInitials(post.user_name)}</div>
                    )}

                    <div className="flex-1">
                      <div>
                        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{post.user_name}</p>
                        {post.user_headline && (
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{post.user_headline}</p>
                        )}
                        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </p>
                      </div>

                      <p className="mt-3 whitespace-pre-wrap" style={{ color: 'var(--text-primary)', lineHeight: 1.6 }}>
                        {renderHashtags(post.content)}
                      </p>

                      {post.image && (
                        <img
                          src={post.image}
                          alt="Post"
                          className="mt-4 w-full rounded-lg max-h-96 object-cover"
                        />
                      )}

                      <div className="flex items-center gap-4 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          <Heart size={18} />
                          <span>{post.reactions?.length || 0}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          <MessageCircle size={18} />
                          <span>Comments</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
