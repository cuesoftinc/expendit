"use client";
import React, { Fragment, useEffect } from "react";
import styles from "./styles";
import Input from "../signup/Input";
import LoaderSpinner from "../helpers/LoaderSpinner";
import Notification from "../helpers/Notification";
import { useSignInCustomState } from "./states";
import Link from "next/link";
import { useRouter } from "next/navigation";

const Form = () => {
  const router = useRouter();
  const {
    form,
    formError,
    formSuccess,
    formLoading,
    handleChange,
    handleSubmit,
    setFormError,
  } = useSignInCustomState();

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
          router.push("/dashboard");
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
        <p className={styles.subHead}>Login</p>
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
        <div className={styles.checkboxWrapper}>
          <p className={styles.checkbox}>
            <input className="mr-2" type="checkbox" />
            Remember me
          </p>
          <Link href="/forgotpassword" className={styles.link}>
            Forgot password?
          </Link>
        </div>

        <div className="flex items-center my-4">
          <div className="flex-1 h-px bg-gray-300"></div>
          <p className="px-2 text-sm text-gray-500">OR</p>
          <div className="flex-1 h-px bg-gray-300"></div>
        </div>

        <div className="w-full mb-4">
          <div id="googleBtn"></div>
        </div>

        <div className="w-full mt-6">
          <button type="submit" className={styles.btn} disabled={formLoading}>
            {formLoading ? (
              <LoaderSpinner style="spin" variant="spin-small" />
            ) : (
              "Sign in"
            )}
          </button>
        </div>
        <p className={styles.signUp}>
          New to Expendit?{" "}
          <Link href="/signup" className={styles.link}>
            Create an account
          </Link>
        </p>
      </form>
    </Fragment>
  );
};

export default Form;
