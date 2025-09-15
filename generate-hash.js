const bcrypt = require('bcryptjs');

const password = 'Password123!';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, function(err, hash) {
    if (err) {
        console.error('Error:', err);
        return;
    }
    console.log('Hash for Password123!:');
    console.log(hash);
});