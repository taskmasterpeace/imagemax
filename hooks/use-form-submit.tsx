"use client";
import { useState } from "react";

type SubmitCallback<T = void> = (value?: T) => Promise<void> | void;

export const useLoading = (onSubmitCallback: SubmitCallback) => {
  const [processing, setProcessing] = useState(false);

  const onSubmit = async (value?: any) => {
    setProcessing(true);
    try {
      await onSubmitCallback(value);
    } catch (error) {
      console.log("Error while submitting form", error);
    } finally {
      setProcessing(false);
    }
  };
  return { onSubmit, processing } as const;
};
