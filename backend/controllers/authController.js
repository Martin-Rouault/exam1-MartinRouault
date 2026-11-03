// backend/controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User'); // modèle utilisateur
require('dotenv').config();
const axios = require('axios');
const authLog = require('debug')('authRoutes:console')
//const sendEmail = require('../services/emailService')

exports.login = async (req, res) => {
  const { username, password } = req.body;
  authLog(`tentative de connexion : ${username}`);

  // Formulaire vide : sans ce contrôle, findOne({ username: undefined }) renvoie le premier utilisateur
  if (!username || !password) {
    return res.status(400).json({ message: 'Nom d\'utilisateur et mot de passe requis.' });
  }


  try {
    const user = await User.findOne({ username });

    // Message identique que l'utilisateur existe ou non : empêche de deviner les comptes existants
    const isMatch = user ? await bcrypt.compare(password, user.password) : false;
    if (!isMatch) return res.status(401).json({ message: 'Identifiants incorrects.' });

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h', algorithm: 'HS256' }
    );

    res.json({ token, role: user.role, username: user.username });
  } catch (error) {
    console.error('Erreur lors de la connexion', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};


exports.register = async (req, res) => {
  const { username, email, password } = req.body;
  authLog(`inscription : ${username}`);

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Tous les champs sont obligatoires.' });
  }

  try {
    // Vérifier si l'email ou le nom d'utilisateur existe déjà
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });

    if (existingUser) {
      const message = existingUser.email === email
        ? 'Cet email est déjà utilisé.'
        : 'Ce nom d\'utilisateur est déjà utilisé.';
      return res.status(409).json({ message });
    }

    // Créer un nouvel utilisateur
    const user = new User({ username, email, password });
    await user.save();

    authLog(`utilisateur créé : ${user._id}`);

    // Envoyer un email de bienvenue
    // await sendEmail(
    //   email,
    //   'Bienvenue dans notre application',
    //   `Bonjour ${username},\n\nMerci de vous être inscrit. Nous sommes ravis de vous accueillir !`
    // );

    // await axios.post('http://localhost:4002/notify', {
    //   to: email,
    //   subject: 'Bienvenue dans notre application',
    //   text: `Bonjour ${username},\n\nMerci de vous être inscrit. Nous sommes ravis de vous accueillir !`,
    // });

    res.status(201).json({ message: 'Utilisateur créé avec succès.' });
  } catch (error) {
    // Doublon détecté par l'index unique (requêtes simultanées)
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Cet email ou ce nom d\'utilisateur est déjà utilisé.' });
    }
    console.error('Erreur lors de l\'inscription', error);
    res.status(500).json({ message: 'Une erreur est survenue.' });
  }
};