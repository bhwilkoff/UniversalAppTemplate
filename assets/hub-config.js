// Where the hub's database lives. Both values are public by design: the
// rules about who can see and change what are enforced in the database
// (supabase/migrations), never here.
window.HUB = {
  url: 'https://bifrieqzkihuxfzttgvd.supabase.co',
  key: 'sb_publishable_bdJoZ7bc6Lk0Ug2Z37yn2g_A8AjkjKC',
  // The Google sign-in client in the human-shaped Cloud project. Public by
  // design: Google checks the page's origin, and Supabase checks the token.
  googleClientId: '1086485459450-me3ejointl1dq4kd2qpq4d6tqla696uf.apps.googleusercontent.com'
};
