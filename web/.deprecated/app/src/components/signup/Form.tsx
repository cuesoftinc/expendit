"use client";
import React, { Fragment, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";  // ADD THIS
import styles from "./styles";
import Input from "./Input";
import LoaderSpinner from "../helpers/LoaderSpinner";
import Notification from "../helpers/Notification";
import { useSignUpCustomState } from "./states";

const Form = () => {
  const router = useRouter();  // ADD THIS

  const {
    form,
    formError,
    formSuccess,
    formLoading,
    handleChange,
    handleSubmit,
    setFormError,   // ADD THIS
  } = useSignUpCustomState();

  const handleGoogle = (response: any) => {
    const token = response.credential;

    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          const jwt = data.user.token;
          const user_id = data.user.user_id;
          localStorage.setItem("Expendit-token", JSON.stringify(jwt));
          localStorage.setItem("Expendit-userID", JSON.stringify(user_id));
          localStorage.setItem("Expendit-user", JSON.stringify(data.user));
          localStorage.setItem("ExpenditLoggedIn", JSON.stringify(true));
          router.push("/");
        }
      })
      .catch(err => {
        console.error("Google login error:", err);
        setFormError("Google sign in failed, try again");
      });
  };

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: handleGoogle,
      });

      window.google.accounts.id.renderButton(
        document.getElementById("googleBtn"),
        {
          theme: "outline",
          size: "large",
          width: "100%",
        }
      );
    };
  }, []);

  return (
    <Fragment>
      {formError !== "" && <Notification msg={formError} type="error" />}
      {formSuccess !== "" && <Notification msg={formSuccess} type="success" />}
      <form className={`${styles.formCont}`} onSubmit={handleSubmit}>
        <p className={styles.subHead}>Create your account</p>

        <Input
          label="First Name"
          name="firstName"
          type="text"
          value={form.firstName}
          placeholder="Enter your Firstname"
          handleChange={handleChange}
        />
        <Input
          label="Last Name"
          name="lastName"
          type="text"
          value={form.lastName}
          placeholder="Enter your Lastname"
          handleChange={handleChange}
        />
        <Input
          label="Email"
          name="email"
          type="email"
          value={form.email}
          placeholder="name@email.com"
          handleChange={handleChange}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          value={form.password}
          placeholder="Enter your Password"
          handleChange={handleChange}
        />
        <Input
          label="Phone Number"
          name="phoneNumber"
          type="text"
          value={form.phoneNumber}
          placeholder="Enter your Phone Number"
          handleChange={handleChange}
        />

        <div className="w-full">
          <div className={`${styles.check} mt-8`}>
            <input type="checkbox" className={styles.checkbox} />
            <p>
              By signing up, I agree to Expendit's &nbsp;
              <span className={styles.links}>terms & conditions</span>
            </p>
          </div>
        </div>

        <div className="flex items-center my-4">
          <div className="flex-1 h-px bg-gray-300"></div>
          <p className="px-2 text-sm text-gray-500">OR</p>
          <div className="flex-1 h-px bg-gray-300"></div>
        </div>

        <div className="w-full mt-6">
          <div id="googleBtn"></div>
        </div>

        <div className="w-full mt-6">
          <button type="submit" className={styles.btn} disabled={formLoading}>
            {formLoading ? (
              <LoaderSpinner style="spin" variant="spin-small" />
            ) : (
              "Sign up"
            )}
          </button>
        </div>
        <div className="mt-3 text-sm">
          Already have an Account? &nbsp;
          <Link href="/signin" className={styles.links} onClick={() => {}}>
            Log in
          </Link>
        </div>
      </form>
    </Fragment>
  );
};

export default Form;