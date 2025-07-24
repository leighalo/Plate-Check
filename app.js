// Replace with your Supabase project URL and anon key
const SUPABASE_URL = 'https://ihxodcnevbkueuxfsqst.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloeG9kY25lYnZia2Via2V1eGZzcXN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMjI3NDksImV4cCI6MjA2ODg5ODc0OX0.YFT79YHVKiKalWh9zw6spwPUcIyo0qsCWXHICOTF9J8';

// Initialize Supabase client
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Animal avatars to pick randomly on sign-up
const animalAvatars = [
  'https://i.imgur.com/1cD8CqO.png', // cat
  'https://i.imgur.com/0P1PqtK.png', // dog
  'https://i.imgur.com/2XeRJKz.png', // fox
  'https://i.imgur.com/YwQa16Y.png', // panda
  'https://i.imgur.com/3v9YRnL.png'  // owl
];

// Helper to get random avatar URL
function getRandomAvatar() {
  const index = Math.floor(Math.random() * animalAvatars.length);
  return animalAvatars[index];
}

// ========== AUTH FUNCTIONS ==========

async function signUp() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  if (!email || !password) {
    alert('Please enter email and password.');
    return;
  }

  const { data: { user }, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    alert(error.message);
  } else {
    // Insert profile with random avatar and username = email initially
    const avatar_url = getRandomAvatar();
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{ id: user.id, avatar_url, username: email, default_animal: avatar_url }]);
    
    if (profileError) alert('Profile creation error: ' + profileError.message);
    else alert('Signed up! Please check your email to confirm.');
  }
}

async function signIn() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  if (!email || !password) {
    alert('Please enter email and password.');
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    alert(error.message);
  } else {
    updateUIAfterLogin(data.user);
  }
}

async function signOut() {
  await supabase.auth.signOut();
  resetUIAfterLogout();
}

function resetUIAfterLogout() {
  document.getElementById('auth').style.display = 'block';
  document.getElementById('user-info').style.display = 'none';
  document.getElementById('username').innerText = '';
  document.getElementById('profile-pic').src = '';
}

async function updateUIAfterLogin(user) {
  document.getElementById('auth').style.display = 'none';
  document.getElementById('user-info').style.display = 'block';

  // Fetch profile info
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('avatar_url, username')
    .eq('id', user.id)
    .single();

  if (error) {
    alert('Error loading profile: ' + error.message);
    return;
  }

  document.getElementById('profile-pic').src = profile.avatar_url;
  document.getElementById('username').innerText = profile.username;
}

// Update username
async function updateUsername() {
  const newUsername = document.getElementById('new-username').value.trim();
  if (!newUsername) {
    alert('Enter a new username.');
    return;
  }
  const user = supabase.auth.getUser();
  const { data: currentUser } = await user;
  if (!currentUser) {
    alert('You must be logged in to update username.');
    return;
  }

  const { error } = await supabase
    .from('profiles')
    .update({ username: newUsername })
    .eq('id', currentUser.id);

  if (error) {
    alert('Failed to update username: ' + error.message);
  } else {
    alert('Username updated!');
    document.getElementById('username').innerText = newUsername;
    document.getElementById('new-username').value = '';
  }
}

// Upload profile photo
async function uploadPhoto() {
  const fileInput = document.getElementById('upload-photo');
  const file = fileInput.files[0];
  if (!file) {
    alert('Please select a file first.');
    return;
  }

  const userResponse = await supabase.auth.getUser();
  const user = userResponse.data.user;
  if (!user) {
    alert('You must be logged in to upload a photo.');
    return;
  }

  // Upload to Supabase Storage in 'avatars' bucket
  const fileExt = file.name.split('.').pop();
  const filePath = `${user.id}/avatar.${fileExt}`;
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    alert('Upload failed: ' + uploadError.message);
    return;
  }

  // Get public URL
  const { data: { publicUrl }, error: urlError } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  if (urlError) {
    alert('Failed to get public URL: ' + urlError.message);
    return;
  }

  // Update profile with new avatar URL
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id);

  if (updateError) {
    alert('Failed to update avatar URL: ' + updateError.message);
  } else {
    alert('Profile photo updated!');
    document.getElementById('profile-pic').src = publicUrl;
    fileInput.value = '';
  }
}

// ========== VOTING FUNCTIONS ==========

async function addVote(user_id, plate, state, vote_type) {
  // Remove previous vote for the same plate/state by this user (if any)
  await supabase
    .from('votes')
    .delete()
    .eq('user_id', user_id)
    .eq('plate', plate)
    .eq('state', state);

  // Add new vote
  const { error } = await supabase
    .from('votes')
    .insert([{ user_id, plate, state, vote_type }]);

  if (error) {
    alert('Failed to add vote: ' + error.message);
  }
}

async function getVoteCounts(plate, state) {
  const { data, error } = await supabase
    .from('votes')
    .select('vote_type')
    .eq('plate', plate)
    .eq('state', state);

  if (error) {
    alert('Failed to fetch votes: ' + error.message);
    return { likes: 0, dislikes: 0 };
  }

  let likes = 0;
  let dislikes = 0;
  data.forEach(vote => {
    if (vote.vote_type === 'like') likes++;
    else if (vote.vote_type === 'dislike') dislikes++;
  });

  return { likes, dislikes };
}

// ========== COMMENTS FUNCTIONS ==========

async function addComment(user_id, plate, state, comment_text) {
  const { error } = await supabase
    .from('comments')
    .insert([{ user_id, plate, state, comment_text }]);

  if (error) {
    alert('Failed to add comment: ' + error.message);
  }
}

async function getCommentsWithProfiles(plate, state) {
  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      profiles:profiles (
        username,
        avatar_url,
        default_animal
      )
    `)
    .eq('plate', plate)
    .eq('state', state)
    .order('created_at', { ascending: true });

  if (error) {
    alert('Failed to fetch comments: ' + error.message);
    return [];
  }

  return data;
}
