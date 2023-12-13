import { getDatabase, ref, push as dbPush } from 'firebase/database';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { getStorage, ref as storageRef, uploadString } from 'firebase/storage';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { push } from 'firebase/database';
import React, { useState, useEffect } from 'react';
import './App.css';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyArXimidx7xfgtN7JJETCTwcWPCbEsz61k",
  authDomain: "cond-a45a5.firebaseapp.com",
  databaseURL: "https://cond-a45a5-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "cond-a45a5",
  storageBucket: "cond-a45a5.appspot.com",
  messagingSenderId: "456024160042",
  appId: "1:456024160042:web:b863e1625ed3134bbc5053",
  measurementId: "G-DJ3YKEQ1LD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);
const storage = getStorage(app); // Add this line for Firebase Storage initialization

function App() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [bills, setBills] = useState([]);
  const [billType, setBillType] = useState('agua'); // Default to 'agua' (water)
  const [billAmount, setBillAmount] = useState(0);

  const [monthlyPayments, setMonthlyPayments] = useState(Array(6).fill(0)); // Updated for 6 apartments
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [image, setImage] = useState(null);

  const [resumoMensal, setResumoMensal] = useState([]);

  const auth = getAuth(app);

const handleLogin = async () => {
  try {
    if (username === 'sindico' && password === 'kktaa2023') {
      // Simulate admin login
      setUser('admin');
    } else if (username === 'morador' && password === 'morador') {
      // Simulate morador login
      setUser('morador');
    } else {
      // Use Firebase Authentication for real authentication
      const userCredential = await signInWithEmailAndPassword(auth, username, password);
      setUser(userCredential.user);
    }
  } catch (error) {
    console.error('Authentication failed:', error.message);
    // Handle authentication error
  }
};

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    setUser(user); // Update user state based on authentication state
  });

  return () => unsubscribe(); // Unsubscribe from the listener when the component unmounts
}, [auth]);

  const handleLogout = () => {
    setUser(null);
  };

  const handleAddBill = () => {
    const newBillItem = { type: billType, amount: -billAmount };
    setBills([...bills, newBillItem]);
    setBillAmount(0);
  };

  const handleDeleteBill = (index) => {
    // Only allow deletion for admin
    if (user === 'admin') {
      const updatedBills = [...bills];
      updatedBills.splice(index, 1);
      setBills(updatedBills);
    }
  };

  const handleUpdateMonthlyPayment = (apartmentIndex, amount) => {
    // Only allow updates for admin
    if (user === 'admin') {
      const updatedPayments = [...monthlyPayments];
      updatedPayments[apartmentIndex] = amount;
      setMonthlyPayments(updatedPayments);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onloadend = () => {
      const uploadedImage = reader.result;
      setImage(uploadedImage);
    };

    if (file) {
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteComment = (index) => {
    // Allow the user to delete their own comment or allow sindico to delete any comment
    const canDeleteComment = comments[index].user === user || user === 'admin';

    if (canDeleteComment) {
      const updatedComments = [...comments];
      updatedComments.splice(index, 1);
      setComments(updatedComments);
    }
  };

  const calculateTotalPayments = () => {
    return monthlyPayments.reduce((total, payment) => total + payment, 0);
  };

  const calculateTotalBills = () => {
    return bills.reduce((total, bill) => total - bill.amount, 0);
  };

  const calculateBalance = () => {
    const totalPayments = calculateTotalPayments();
    const totalBills = calculateTotalBills();
    return totalPayments - totalBills;
  };

  const isAdmin = user === 'admin';
  const isMorador = user === 'morador';

  const handleGenerateResumoMensal = async () => {
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString();
  
    const totalPayments = calculateTotalPayments();
    const totalBills = calculateTotalBills();
    const balance = totalPayments - totalBills;
  
    const transactionsRef = ref(database, 'transactions');
    const newTransactionRef = dbPush(transactionsRef);
    const transactionId = newTransactionRef.key;
  
    const condominiumPaymentsRef = ref(database, 'condominiumPayments');
    const newCondominiumPaymentRef = dbPush(condominiumPaymentsRef);
    const condominiumPaymentId = newCondominiumPaymentRef.key;
  
    const newResumoMensalItem = {
      date: formattedDate,
      user,
      totalPayments,
      totalBills,
      balance,
      transactions: transactionId,
      condominiumPayments: condominiumPaymentId,
    };
  
    await push(newTransactionRef, {
      type: 'Resumo Mensal',
      amount: -totalPayments,
    });
  
    await push(newCondominiumPaymentRef, {
      apartmentNumbers,
      amount: monthlyPayments,
    });
  
    await push(ref(database, 'resumoMensal'), newResumoMensalItem);
  };
  
  const handleLeaveComment = async () => {
    const commentsRef = ref(database, 'comments');
    const newCommentRef = dbPush(commentsRef);
  
    let imageURL = null;
  
    if (image) {
      const storage = getStorage();
      const imageRef = storageRef(storage, `images/${newCommentRef.key}`);
      await uploadString(imageRef, image, 'data_url');
      imageURL = await imageRef.getDownloadURL();
    }
  
    const newCommentItem = {
      user,
      comment: newComment,
      image: imageURL,
    };
  
    await push(newCommentRef, newCommentItem);
    setNewComment('');
    setImage(null);
  };

  const handleDeleteResumoMensal = (date) => {
    // Allow deletion for admin or the user (morador) who generated the report
    if (user === 'admin' || (isMorador && resumoMensal.some(item => item.date === date && item.user === user))) {
      const updatedResumoMensal = resumoMensal.filter((item) => item.date !== date);
      setResumoMensal(updatedResumoMensal);
    }
  };

  const apartmentNumbers = ['R/C - Frente', 'R/C - Esquerdo', 'R/C - Direito', '1 Frente', '1 Esquerdo', '1 Direito'];

  return (
    <div className="App">
      <header>
        <h1 style={{ color: isAdmin ? '#008000' : 'blue' }}>
          {isAdmin ? 'Portal da Transparência - Condomínio' : 'Portal da Transparência - Condomínio'}
        </h1>
      </header>
      {user ? (
        <>
          <div>
            <p>Data e Hora Atuais: {new Date().toLocaleString()}</p>
          </div>
          <div>
            {isAdmin && <button onClick={handleLogout}>Sair</button>}
            {isMorador && <button onClick={handleLogout}>Sair</button>}
          </div>
          {isAdmin && (
            <>
              <div>
                <h2>Contas</h2>
                <div>
                  <label htmlFor="billType">Tipo de Conta:</label>
                  <select
                    id="billType"
                    value={billType}
                    onChange={(e) => setBillType(e.target.value)}
                  >
                    <option value="agua">Água</option>
                    <option value="energia">Energia</option>
                    <option value="gas">Gás</option>
                    <option value="manutencao">Manutencao</option>
                    <option value="limpeza">Limpeza</option>
                    <option value="conta CGD condominio">conta CGD condominio</option>
                    <option value="outros">outros</option>
                  </select>
                </div>
                <div>
                <label htmlFor="billAmount">Valor da Conta:</label>
                  <input
                    type="number"
                    id="billAmount"
                    value={billAmount}
                    onChange={(e) => setBillAmount(parseFloat(e.target.value))}
                  />
                  <button onClick={handleAddBill}>Adicionar Conta</button>
                  <ul>
                    {bills.map((bill, index) => (
                      <li key={index}>
                        {bill.type} - €{bill.amount.toFixed(2)}
                        {isAdmin && (
                          <button onClick={() => handleDeleteBill(index)}>Excluir</button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div>
                <h2>Pagamentos Mensais</h2>
                <ul>
                  {monthlyPayments.map((amount, index) => (
                    <li key={index}>
                      {apartmentNumbers[index]}:
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => handleUpdateMonthlyPayment(index, parseFloat(e.target.value))}
                      />
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2>Resumo Mensal</h2>
                <button onClick={handleGenerateResumoMensal}>Gerar Resumo Mensal</button>
                <ul>
                  {resumoMensal.map((item) => (
                    <li key={item.date}>
                      <strong>Data: {item.date}</strong>
                      <p>Total Pagamentos de mensalidades: €{item.totalPayments.toFixed(2)}</p>
                      <p>Total Contas a serem pagas neste mes: €{item.totalBills.toFixed(2)}</p>
                      <p>Saldo no caixa do condominio: €{item.balance.toFixed(2)}</p>
                      <ul>
                        {item.transactions.map((transaction, index) => (
                          <li key={index}>
                            {transaction.type} - €{transaction.amount.toFixed(2)}
                          </li>
                        ))}
                      </ul>
                      <p>Pagamentos por Apartamento:</p>
                      <ul>
                        {item.condominiumPayments.map((payment) => (
                          <li key={payment.apartment}>
                            {payment.apartment} - €{payment.amount.toFixed(2)}
                          </li>
                        ))}
                      </ul>
                      {isAdmin && (
                        <button onClick={() => handleDeleteResumoMensal(item.date)}>
                          Excluir Resumo Mensal
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
          {isMorador && (
            <div>
              <h2>Resumo Mensal Detalhado</h2>
              <ul>
                {resumoMensal.map((item) => (
                  <li key={item.date}>
                    <strong>Data: {item.date}</strong>
                    <p>Total Pagamentos de mensalidades: €{item.totalPayments.toFixed(2)}</p>
                    <p>Total Contas a serem pagas neste mes: €{item.totalBills.toFixed(2)}</p>
                    <p>Saldo no caixa do condominio: €{item.balance.toFixed(2)}</p>
                    <ul>
                      {item.transactions.map((transaction, index) => (
                        <li key={index}>
                          {transaction.type} - €{transaction.amount.toFixed(2)}
                        </li>
                      ))}
                    </ul>
                    <p>Pagamentos por Apartamento:</p>
                    <ul>
                      {item.condominiumPayments.map((payment) => (
                        <li key={payment.apartment}>
                          {payment.apartment} - €{payment.amount.toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <h2>Comentários</h2>
            <ul>
              {comments.map((comment, index) => (
                <li key={index}>
                  <strong>{comment.user}</strong>: {comment.comment}
                  {comment.image && (
                    <div>
                      <img
                        src={comment.image}
                        alt={`uploaded by ${comment.user}`}
                        style={{ maxWidth: '100%' }}
                      />
                    </div>
                  )}
                  {(comment.user === user || user === 'admin') && (
                    <button onClick={() => handleDeleteComment(index)}>
                      Excluir Comentário
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {user && (
              <div>
                <textarea
                  placeholder="Deixe um comentário..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <input type="file" accept="image/*" onChange={handleImageUpload} />
                <button onClick={handleLeaveComment}>Comentar</button>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div>
            <label htmlFor="username">Usuário:</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password">Senha:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button onClick={handleLogin}>Entrar</button>
        </>
      )}
    </div>
  );
}

export default App;
