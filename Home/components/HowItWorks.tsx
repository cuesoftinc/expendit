import React from 'react';

function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-gray-100 py-10">
      <h2 className="text-3xl font-semibold mb-4">How It Works</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border rounded-lg shadow-lg bg-white">
          <p className="mb-2"><strong>User Registration:</strong> Explain the process of creating an account or logging in to the website.</p>
        </div>
        <div className="p-4 border rounded-lg shadow-lg bg-white">
          <p className="mb-2"><strong>Dashboard:</strong> Describe the main dashboard and how it presents an overview of your financial data.</p>
        </div>
        <div className="p-4 border rounded-lg shadow-lg bg-white">
          <p className="mb-2"><strong>Budgeting:</strong> If available, describe how you can create and manage budgets.</p>
        </div>
        <div className="p-4 border rounded-lg shadow-lg bg-white">
          <p className="mb-2"><strong>Expense Input:</strong> Detail how you can input your expenses, whether manually or through imports, and how to specify categories.</p>
        </div>
        <div className="p-4 border rounded-lg shadow-lg bg-white">
          <p className="mb-2"><strong>Real-Time Reports:</strong> Highlight how you can generate real-time reports from your inputted data.</p>
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
