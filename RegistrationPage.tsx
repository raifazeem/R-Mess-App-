import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData, useTheme } from '../App';
import { Button, Card, Input, Icons } from '../components/ui';

const RegistrationPage: React.FC = () => {
  const { actions } = useData();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    profession: '',
    contactNumber: '',
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic validation
    for (const key in formData) {
        if (!formData[key as keyof typeof formData]) {
            setError(`Please fill out the ${key.replace(/([A-Z])/g, ' $1').toLowerCase()} field.`);
            return;
        }
    }
    
    if (isNaN(Number(formData.age)) || Number(formData.age) <= 0) {
        setError("Please enter a valid age.");
        return;
    }

    actions.addRegistrationRequest({
        ...formData,
        age: Number(formData.age)
    });

    setSuccess(true);
  };
  
  const appIconSrc = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEyOCIgaGVpZ2h0PSIxMjgiIHJ4PSIyOCIgZmlsbD0iIzNCODJGNiIvPjxwYXRoIGQ9Ik0yNCA4OEMyNCA4OCAzNiA3NiA2NCA3NkM5MiA3NiAxMDQgODggMTA0IDg4Vjk2SDI0Vjg4WiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTQ0IDY0QzQ0IDY0IDQ4IDUyIDU2IDUyQzY0IDUyIDY4IDY0IDY4IDY0IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48cGF0aCBkPSJNNjggNjRDNjggNjQgNzIgNTIgODAgNTJDODggNTIgOTIgNjQgOTIgNjQiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMTIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjxwYXRoIGQ9Ik01NiA0MEM1NiA0MCA2MCAyOCA2OCAyOEM3NiAyOCA4MCA0MCA4MCA0MCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 relative p-4">
      <div className="absolute top-4 right-4">
        <Button onClick={toggleTheme} variant="ghost" size="sm">
          {theme === 'light' ? <Icons.Moon /> : <Icons.Sun />}
        </Button>
      </div>
       <div className="text-center mb-8">
        <img src={appIconSrc} alt="App Logo" className="w-20 h-20 mx-auto mb-2" />
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">R-Mess</h1>
        <p className="text-gray-500 dark:text-gray-400">Create Your Mess Account</p>
      </div>
      <Card className="w-full max-w-md">
        {success ? (
          <div className="text-center">
            <Icons.CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Request Submitted!</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Your registration request has been sent to the administrator for approval. You will be notified once it's reviewed.</p>
            <Button onClick={() => navigate('/login')} className="w-full">Back to Login</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Full Name" id="name" value={formData.name} onChange={handleChange} required />
                <Input label="Age" id="age" type="number" value={formData.age} onChange={handleChange} required />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Profession" id="profession" value={formData.profession} onChange={handleChange} required />
                <Input label="Contact Number" id="contactNumber" value={formData.contactNumber} onChange={handleChange} required />
            </div>
             <hr className="my-4 border-gray-300 dark:border-gray-600"/>
            <Input label="Username" id="username" value={formData.username} onChange={handleChange} required autoComplete="username" />
            <Input label="Password" id="password" type="password" value={formData.password} onChange={handleChange} required autoComplete="new-password" />
            
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}

            <Button type="submit" className="w-full">Register</Button>

             <div className="text-sm text-center">
                <span className="text-gray-600 dark:text-gray-400">Already have an account? </span>
                <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
                    Sign In
                </Link>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};

export default RegistrationPage;