import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, MessageCircle, Edit2, Trash2, Send, Image as ImageIcon, X, ThumbsUp, Award, Lightbulb, Smile, Bookmark, BookmarkCheck, TrendingUp, Users, Search, Bell, Home, Heart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { REACTIONS, getInitials, renderHashtags } from './FeedHelpers';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Feed({ user, onLogout, token, refreshUser }) {
  const [state, setState] = useState({
    posts: [], trendingPosts: [], suggestedUsers: [], notifications: [],
    unreadCount: 0, comments: {}, newComment: {}, showReactions: null,
    showNotifications: false, searchQuery: '', feedView: 'all'
  });
  
  const [newPost, setNewPost] = useState({ content: '', image: null });
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
    const interval = setInterval(() => axios.get(`${API}/notifications/unread/count`, {headers:{Authorization:`Bearer ${token}`}}).then(r=>setState(s=>({...s,unreadCount:r.data.count}))).catch(()=>{}), 30000);
    return () => clearInterval(interval);
  }, [state.feedView]);

  const loadData = async () => {
    try {
      const [postsRes, trendingRes, suggestedRes, notifsRes, countRes] = await Promise.all([
        axios.get(`${API}${state.feedView==='following'?'/posts':'/posts/all'}`, {headers:{Authorization:`Bearer ${token}`}}),
        axios.get(`${API}/posts/trending`),
        axios.get(`${API}/users/suggested/me`, {headers:{Authorization:`Bearer ${token}`}}),
        axios.get(`${API}/notifications`, {headers:{Authorization:`Bearer ${token}`}}),
        axios.get(`${API}/notifications/unread/count`, {headers:{Authorization:`Bearer ${token}`}})
      ]);
      setState(s => ({...s, posts:postsRes.data, trendingPosts:trendingRes.data, suggestedUsers:suggestedRes.data, notifications:notifsRes.data, unreadCount:countRes.data.count}));
    } catch(e) { console.error('Load failed', e); }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.content.trim()) return toast.error('Content required');
    setLoading(true);
    try {
      await axios.post(`${API}/posts`, newPost, {headers:{Authorization:`Bearer ${token}`}});
      setNewPost({content:'',image:null}); setImagePreview(null); setShowCreatePost(false);
      toast.success('Posted!'); loadData();
    } catch(e) { toast.error('Failed'); } finally { setLoading(false); }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5*1024*1024) return toast.error('Max 5MB');
    setLoading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await axios.post(`${API}/upload`, fd, {headers:{Authorization:`Bearer ${token}`}});
      setNewPost({...newPost, image:res.data.image}); setImagePreview(res.data.image);
      toast.success('Uploaded');
    } catch(e) { toast.error('Upload failed'); } finally { setLoading(false); }
  };

  const handleReaction = async (postId, type) => {
    try {
      await axios.post(`${API}/posts/${postId}/react?reaction_type=${type}`, {}, {headers:{Authorization:`Bearer ${token}`}});
      loadData(); setState(s=>({...s,showReactions:null}));
    } catch(e) { toast.error('Failed'); }
  };

  const fetchComments = async (postId) => {
    if (state.comments[postId]) return setState(s=>({...s,comments:{...s.comments,[postId]:null}}));
    try {
      const res = await axios.get(`${API}/posts/${postId}/comments`, {headers:{Authorization:`Bearer ${token}`}});
      setState(s=>({...s,comments:{...s.comments,[postId]:res.data}}));
    } catch(e) { toast.error('Failed'); }
  };

  const handleComment = async (postId) => {
    if (!state.newComment[postId]?.trim()) return;
    try {
      await axios.post(`${API}/posts/${postId}/comments`, {content:state.newComment[postId]}, {headers:{Authorization:`Bearer ${token}`}});
      setState(s=>({...s,newComment:{...s.newComment,[postId]:''}}));
      fetchComments(postId); toast.success('Commented');
    } catch(e) { toast.error('Failed'); }
  };

  const handleBookmark = async (postId) => {
    try {
      const isCurrentlyBookmarked = user?.bookmarks?.includes(postId);
      
      if (user) {
        if (isCurrentlyBookmarked) {
          user.bookmarks = user.bookmarks.filter(id => id !== postId);
        } else {
          user.bookmarks = [...(user.bookmarks || []), postId];
        }
      }
      
      setState(s => ({...s}));
      
      await axios.post(`${API}/posts/${postId}/bookmark`, {}, {headers:{Authorization:`Bearer ${token}`}});
      toast.success(isCurrentlyBookmarked ? 'Bookmark removed' : 'Bookmarked');
    } catch(e) { 
      toast.error('Failed');
      loadData();
    }
  };

  const handleFollow = async (userId) => {
    try {
      const isCurrentlyFollowing = user?.following?.includes(userId);
      
      if (user) {
        if (isCurrentlyFollowing) {
          user.following = user.following.filter(id => id !== userId);
        } else {
          user.following = [...(user.following || []), userId];
        }
      }
      
      setState(s => ({...s}));
      
      await axios.post(`${API}/users/${userId}/follow`, {}, {headers:{Authorization:`Bearer ${token}`}});
      
      toast.success(isCurrentlyFollowing ? 'Unfollowed' : 'Following!');
      
      setTimeout(() => {
        axios.get(`${API}/users/suggested/me`, {headers:{Authorization:`Bearer ${token}`}})
          .then(res => setState(s => ({...s, suggestedUsers: res.data})))
          .catch(() => {});
      }, 300);
    } catch(e) { 
      toast.error('Failed to update');
      loadData();
    }
  };

  const handleEdit = async (postId) => {
    if (!editContent.trim()) return;
    try {
      await axios.put(`${API}/posts/${postId}`, {content:editContent}, {headers:{Authorization:`Bearer ${token}`}});
      setEditingPost(null); setEditContent(''); toast.success('Updated'); loadData();
    } catch(e) { toast.error('Failed'); }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Delete?')) return;
    try {
      await axios.delete(`${API}/posts/${postId}`, {headers:{Authorization:`Bearer ${token}`}});
      toast.success('Deleted'); loadData();
    } catch(e) { toast.error('Failed'); }
  };

  const handleSearch = async () => {
    if (!state.searchQuery.trim()) return loadData();
    try {
      const res = await axios.get(`${API}/posts/search?q=${encodeURIComponent(state.searchQuery)}`);
      setState(s=>({...s,posts:res.data}));
    } catch(e) { toast.error('Search failed'); }
  };

  const getUserReaction = (post) => post.reactions?.find(r => r.user_id === user?.id);
  const getReactionCounts = (post) => {
    const counts = {};
    post.reactions?.forEach(r => counts[r.type] = (counts[r.type] || 0) + 1);
    return counts;
  };

  return (
    <div className="min-h-screen" style={{background:'#f3f2ef'}}>
      {/* Navbar */}
      <nav className="navbar sticky top-0 z-50" data-testid="navbar">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h1 className="text-2xl font-bold cursor-pointer" style={{color:'#0a66c2'}} onClick={()=>navigate('/')} data-testid="app-logo">CareerPulse</h1>
              <div className="hidden md:flex items-center" style={{width:'280px'}}>
                <div className="relative w-full">
                  <input type="text" placeholder="Search..." value={state.searchQuery} onChange={(e)=>setState(s=>({...s,searchQuery:e.target.value}))} onKeyPress={(e)=>e.key==='Enter'&&handleSearch()} className="input-field pr-10" style={{padding:'0.5rem 2.5rem 0.5rem 1rem',fontSize:'0.875rem'}} data-testid="search-input"/>
                  <button onClick={handleSearch} className="absolute right-2 top-1/2 -translate-y-1/2" style={{color:'#666'}} data-testid="search-button"><Search size={18}/></button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex gap-2">
                <button onClick={()=>setState(s=>({...s,feedView:'all'}))} className={`btn-ghost ${state.feedView==='all'?'active':''}`} style={{color:state.feedView==='all'?'#0a66c2':'#666'}} data-testid="all-posts-button"><Home size={20}/>All</button>
                <button onClick={()=>setState(s=>({...s,feedView:'following'}))} className={`btn-ghost ${state.feedView==='following'?'active':''}`} style={{color:state.feedView==='following'?'#0a66c2':'#666'}} data-testid="following-posts-button"><Users size={20}/>Following</button>
              </div>
              <div className="relative">
                <button onClick={()=>{setState(s=>({...s,showNotifications:!s.showNotifications}));if(!state.showNotifications&&state.unreadCount>0)axios.put(`${API}/notifications/read`,{},{headers:{Authorization:`Bearer ${token}`}}).then(()=>setState(s=>({...s,unreadCount:0}))).catch(()=>{});}} className="icon-btn relative" data-testid="notifications-button">
                  <Bell size={20}/>{state.unreadCount>0&&<span className="notification-dot" data-testid="notification-badge"></span>}
                </button>
                {state.showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 premium-card shadow-xl" style={{maxHeight:'400px',overflowY:'auto'}} data-testid="notifications-dropdown">
                    <div className="p-4 border-b" style={{borderColor:'var(--border)'}}><h3 className="font-semibold">Notifications</h3></div>
                    {state.notifications.length===0 ? (
                      <div className="p-6 text-center" style={{color:'var(--text-secondary)'}}>No notifications</div>
                    ) : (
                      <div>{state.notifications.map(n=>(
                        <div key={n.id} className="p-4 border-b hover:bg-gray-50 cursor-pointer" style={{borderColor:'var(--border)'}} data-testid={`notification-${n.id}`}>
                          <div className="flex gap-3">
                            {n.actor_avatar?<img src={n.actor_avatar} alt="" className="avatar-sm"/>:<div className="avatar-sm">{getInitials(n.actor_name)}</div>}
                            <div className="flex-1"><p className="text-sm">{n.message}</p><p className="text-xs mt-1" style={{color:'var(--text-tertiary)'}}>{formatDistanceToNow(new Date(n.created_at),{addSuffix:true})}</p></div>
                          </div>
                        </div>
                      ))}</div>
                    )}
                  </div>
                )}
              </div>
              <button onClick={()=>navigate(`/profile/${user?.id}`)} className="flex items-center gap-2 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors" data-testid="nav-profile-button">
                {user?.avatar?<img src={user.avatar} alt={user.name} className="avatar-sm"/>:<div className="avatar-sm" style={{display:'flex',alignItems:'center',justifyContent:'center'}}>{getInitials(user?.name)}</div>}
                <span className="font-medium text-sm hidden md:inline" style={{color:'var(--text-primary)'}}>Me</span>
              </button>
              <button onClick={onLogout} className="btn-ghost" data-testid="logout-button"><LogOut size={18}/><span className="hidden md:inline">Logout</span></button>
            </div>
          </div>
        </div>
      </nav>

      {/* 3-Column Layout */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar */}
          <div className="lg:col-span-3 space-y-4">
            <div className="premium-card p-4 fade-in" data-testid="profile-card">
              <div
                className="h-16 rounded-t-lg"
                style={{
                  ...(user?.cover_image
                    ? {
                        backgroundImage: `url(${user.cover_image})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                      }
                    : { background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)' }),
                  marginTop: '-1rem',
                  marginLeft: '-1rem',
                  marginRight: '-1rem',
                  marginBottom: '1rem'
                }}
              ></div>
              <div className="text-center" style={{marginTop:'-2.5rem'}}>
                {user?.avatar?<img src={user.avatar} alt={user.name} className="avatar-lg mx-auto" style={{border:'3px solid white'}}/>:<div className="avatar-lg mx-auto" style={{border:'3px solid white'}}>{getInitials(user?.name)}</div>}
                <h3 className="font-bold mt-3" style={{fontSize:'1.1rem'}}>{user?.name}</h3>
                <p className="text-sm mt-1" style={{color:'var(--text-secondary)'}}>{user?.headline||'Professional'}</p>
              </div>
              <div className="mt-4 pt-4 border-t" style={{borderColor:'var(--border)'}}>
                <div className="flex justify-between text-sm"><span style={{color:'var(--text-secondary)'}}>Followers</span><span className="font-semibold">{user?.followers?.length||0}</span></div>
                <div className="flex justify-between text-sm mt-2"><span style={{color:'var(--text-secondary)'}}>Following</span><span className="font-semibold">{user?.following?.length||0}</span></div>
              </div>
              <button onClick={()=>navigate(`/profile/${user?.id}`)} className="btn-secondary w-full mt-4" data-testid="view-profile-button">View Profile</button>
            </div>
          </div>

          {/* Main Feed */}
          <div className="lg:col-span-6 space-y-4">
            {/* Create Post */}
            <div className="premium-card p-4 fade-in" data-testid="create-post-container">
              <button onClick={()=>setShowCreatePost(!showCreatePost)} className="w-full text-left input-field flex items-center gap-3 cursor-pointer" data-testid="create-post-trigger">
                {user?.avatar?<img src={user.avatar} alt={user.name} className="avatar-sm"/>:<div className="avatar-sm">{getInitials(user?.name)}</div>}
                <span style={{color:'var(--text-tertiary)'}}>Start a post...</span>
              </button>
              {showCreatePost && (
                <form onSubmit={handleCreatePost} className="mt-4 space-y-4" data-testid="create-post-form">
                  <textarea className="textarea-field" placeholder="What do you want to talk about?" value={newPost.content} onChange={(e)=>setNewPost({...newPost,content:e.target.value})} data-testid="create-post-textarea" style={{minHeight:'120px'}}/>
                  {imagePreview && (
                    <div className="relative" data-testid="image-preview-container">
                      <img src={imagePreview} alt="Preview" className="w-full rounded-lg max-h-96 object-cover"/>
                      <button type="button" onClick={()=>{setNewPost({...newPost,image:null});setImagePreview(null);}} className="absolute top-2 right-2 bg-white p-2 rounded-full shadow-md hover:bg-gray-100" data-testid="remove-image-button"><X size={16}/></button>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <label className="btn-ghost flex items-center gap-2 cursor-pointer" data-testid="upload-image-label"><ImageIcon size={20}/><span>Photo</span><input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" data-testid="upload-image-input"/></label>
                    <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2" data-testid="submit-post-button">{loading?<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>:'Post'}</button>
                  </div>
                </form>
              )}
            </div>

            {/* Posts */}
            <div className="space-y-4" data-testid="posts-container">
              {state.posts.length===0 ? (
                <div className="premium-card p-12 text-center"><p style={{color:'var(--text-secondary)'}}>No posts. Start following or create one!</p></div>
              ) : (
                state.posts.map((post) => {
                  const userReaction = getUserReaction(post);
                  const reactionCounts = getReactionCounts(post);
                  return (
                    <div key={post.id} className="post-card p-6 fade-in" data-testid={`post-${post.id}`}>
                      <div className="flex items-start gap-3">
                        <button onClick={()=>navigate(`/profile/${post.user_id}`)} data-testid={`post-${post.id}-avatar`}>
                          {post.user_avatar?<img src={post.user_avatar} alt={post.user_name} className="avatar"/>:<div className="avatar">{getInitials(post.user_name)}</div>}
                        </button>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <button onClick={()=>navigate(`/profile/${post.user_id}`)} className="font-semibold hover:text-blue-600" style={{color:'var(--text-primary)'}} data-testid={`post-${post.id}-username`}>{post.user_name}</button>
                              {post.user_headline&&<p className="text-sm" style={{color:'var(--text-secondary)'}}>{post.user_headline}</p>}
                              <p className="text-xs mt-1" style={{color:'var(--text-tertiary)'}} data-testid={`post-${post.id}-timestamp`}>{formatDistanceToNow(new Date(post.created_at),{addSuffix:true})}{post.views>0&&` · ${post.views} views`}</p>
                            </div>
                            <div className="flex gap-2">
                              {user?.id===post.user_id&&(<><button onClick={()=>{setEditingPost(post.id);setEditContent(post.content);}} className="text-gray-500 hover:text-blue-600 p-2" data-testid={`post-${post.id}-edit-button`}><Edit2 size={16}/></button><button onClick={()=>handleDelete(post.id)} className="text-gray-500 hover:text-red-600 p-2" data-testid={`post-${post.id}-delete-button`}><Trash2 size={16}/></button></>)}
                              <button onClick={()=>handleBookmark(post.id)} className="text-gray-500 hover:text-blue-600 p-2" data-testid={`post-${post.id}-bookmark-button`}>{user?.bookmarks?.includes(post.id)?<BookmarkCheck size={16}/>:<Bookmark size={16}/>}</button>
                            </div>
                          </div>
                          {editingPost===post.id ? (
                            <div className="mt-4 space-y-3">
                              <textarea className="textarea-field" value={editContent} onChange={(e)=>setEditContent(e.target.value)} data-testid={`post-${post.id}-edit-textarea`}/>
                              <div className="flex gap-2"><button onClick={()=>handleEdit(post.id)} className="btn-primary" data-testid={`post-${post.id}-save-button`}>Save</button><button onClick={()=>setEditingPost(null)} className="btn-secondary" data-testid={`post-${post.id}-cancel-button`}>Cancel</button></div>
                            </div>
                          ) : (
                            <>
                              <p className="mt-3 whitespace-pre-wrap" style={{color:'var(--text-primary)',lineHeight:1.6}} data-testid={`post-${post.id}-content`}>{renderHashtags(post.content)}</p>
                              {post.image&&<img src={post.image} alt="Post" className="mt-4 w-full rounded-lg max-h-96 object-cover" data-testid={`post-${post.id}-image`}/>}
                              {post.reactions&&post.reactions.length>0&&(
                                <div className="flex items-center gap-2 mt-3 text-sm" style={{color:'var(--text-secondary)'}}>
                                  <div className="flex -space-x-1">{Object.keys(reactionCounts).slice(0,3).map(type=>{const r=REACTIONS.find(x=>x.type===type);if(!r)return null;const Icon=r.icon;return <div key={type} className="w-5 h-5 rounded-full flex items-center justify-center" style={{background:r.color,border:'2px solid white'}}><Icon size={12} color="white"/></div>;})}</div>
                                  <span>{post.reactions.length}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1 mt-4 pt-4 border-t" style={{borderColor:'var(--border)'}}>
                                <div className="relative">
                                  <button onClick={()=>setState(s=>({...s,showReactions:s.showReactions===post.id?null:post.id}))} className={`icon-btn ${userReaction?'active':''}`} data-testid={`post-${post.id}-like-button`}>
                                    {userReaction ? (
                                      (() => {
                                        const reaction = REACTIONS.find(r=>r.type===userReaction.type);
                                        if (!reaction) return <><ThumbsUp size={18}/><span>Like</span></>;
                                        const Icon = reaction.icon;
                                        return <><Icon size={18} color={reaction.color}/><span style={{color:reaction.color}}>{reaction.label}</span></>;
                                      })()
                                    ) : (<><ThumbsUp size={18}/><span>Like</span></>)}
                                  </button>
                                  {state.showReactions===post.id&&(
                                    <div className="absolute bottom-full mb-2 left-0 premium-card shadow-xl p-2 flex gap-1 z-10">
                                      {REACTIONS.map(r=>{const Icon=r.icon;return <button key={r.type} onClick={()=>handleReaction(post.id,r.type)} className="p-2 hover:bg-gray-100 rounded-lg transition-all hover:scale-110" title={r.label} data-testid={`reaction-${r.type}-button`}><Icon size={24} color={r.color}/></button>;})}
                                    </div>
                                  )}
                                </div>
                                <button onClick={()=>fetchComments(post.id)} className="icon-btn" data-testid={`post-${post.id}-comment-button`}><MessageCircle size={18}/><span>Comment</span></button>
                              </div>
                              {state.comments[post.id]&&(
                                <div className="mt-4 space-y-4" data-testid={`post-${post.id}-comments-section`}>
                                  <div className="flex gap-2">
                                    {user?.avatar?<img src={user.avatar} alt="" className="avatar-sm"/>:<div className="avatar-sm">{getInitials(user?.name)}</div>}
                                    <input type="text" placeholder="Add a comment..." value={state.newComment[post.id]||''} onChange={(e)=>setState(s=>({...s,newComment:{...s.newComment,[post.id]:e.target.value}}))} onKeyPress={(e)=>e.key==='Enter'&&handleComment(post.id)} className="input-field flex-1" style={{padding:'0.5rem 1rem'}} data-testid={`post-${post.id}-comment-input`}/>
                                    <button onClick={()=>handleComment(post.id)} className="btn-primary" style={{padding:'0.5rem 1rem'}} data-testid={`post-${post.id}-comment-submit`}><Send size={18}/></button>
                                  </div>
                                  <div className="space-y-3">
                                    {state.comments[post.id].map(c=>(
                                      <div key={c.id} className="flex gap-3" data-testid={`comment-${c.id}`}>
                                        {c.user_avatar?<img src={c.user_avatar} alt={c.user_name} className="avatar-sm"/>:<div className="avatar-sm">{getInitials(c.user_name)}</div>}
                                        <div className="flex-1 rounded-lg p-3" style={{background:'var(--bg-secondary)'}}>
                                          <div className="flex items-start justify-between">
                                            <div><p className="font-semibold text-sm">{c.user_name}</p>{c.user_headline&&<p className="text-xs" style={{color:'var(--text-secondary)'}}>{c.user_headline}</p>}</div>
                                            {user?.id===c.user_id&&<button onClick={()=>axios.delete(`${API}/comments/${c.id}`,{headers:{Authorization:`Bearer ${token}`}}).then(()=>{toast.success('Deleted');fetchComments(post.id);}).catch(()=>toast.error('Failed'))} className="text-gray-400 hover:text-red-600" data-testid={`comment-${c.id}-delete-button`}><Trash2 size={14}/></button>}
                                          </div>
                                          <p className="text-sm mt-1">{c.content}</p>
                                          <p className="text-xs mt-1" style={{color:'var(--text-tertiary)'}}>{formatDistanceToNow(new Date(c.created_at),{addSuffix:true})}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="hidden lg:block lg:col-span-3 space-y-4">
            <div className="premium-card p-4 fade-in" data-testid="trending-section">
              <div className="flex items-center gap-2 mb-4"><TrendingUp size={20} style={{color:'var(--primary)'}}/><h3 className="font-bold">Trending</h3></div>
              {state.trendingPosts.length===0?<p className="text-sm" style={{color:'var(--text-secondary)'}}>No trending posts</p>:(
                <div className="space-y-3">{state.trendingPosts.map((p,i)=>(
                  <div key={p.id} className="pb-3 border-b last:border-0 cursor-pointer hover:bg-gray-50 p-2 rounded" style={{borderColor:'var(--border)'}}>
                    <div className="flex items-start gap-2"><span className="font-bold" style={{color:'var(--text-tertiary)'}}>{i+1}</span><div className="flex-1"><p className="text-sm font-medium line-clamp-2">{p.content}</p><p className="text-xs mt-1" style={{color:'var(--text-secondary)'}}>{p.views} views · {p.reactions?.length||0} reactions</p></div></div>
                  </div>
                ))}</div>
              )}
            </div>
            <div className="premium-card p-4 fade-in" data-testid="suggested-users-section">
              <h3 className="font-bold mb-4">People you may know</h3>
              {state.suggestedUsers.length===0?<p className="text-sm" style={{color:'var(--text-secondary)'}}>No suggestions</p>:(
                <div className="space-y-4">{state.suggestedUsers.map(u=>{
                  const isFollowing = user?.following?.includes(u.id);
                  return (
                  <div key={u.id} className="flex items-start gap-3">
                    <button onClick={()=>navigate(`/profile/${u.id}`)}>{u.avatar?<img src={u.avatar} alt={u.name} className="avatar-sm"/>:<div className="avatar-sm">{getInitials(u.name)}</div>}</button>
                    <div className="flex-1 min-w-0"><button onClick={()=>navigate(`/profile/${u.id}`)} className="font-semibold text-sm hover:text-blue-600 truncate block">{u.name}</button><p className="text-xs truncate" style={{color:'var(--text-secondary)'}}>{u.headline||'Professional'}</p><button onClick={()=>handleFollow(u.id)} className={isFollowing?"btn-primary mt-2 w-full":"btn-secondary mt-2 w-full"} style={{padding:'0.375rem 0.75rem',fontSize:'0.75rem'}} data-testid={`follow-${u.id}-button`}>{isFollowing?'Following':'Follow'}</button></div>
                  </div>
                )})}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
