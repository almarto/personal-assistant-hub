"use client";

import { Upload } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { InventoryItem, InventoryItemImage } from "@/lib/types/inventory";
import { Button } from "@/systemUI/components/Button/Button";

import styles from "../page.module.css";

interface ItemModalProps {
  locationId: string;
  existingItem: InventoryItem | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ItemModal({
  locationId,
  existingItem,
  onClose,
  onSaved,
}: ItemModalProps) {
  const t = useTranslations("Inventory");

  const [name, setName] = useState(existingItem?.name || "");
  const [description, setDescription] = useState(
    existingItem?.description || ""
  );
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(existingItem?.tags || []);
  const [purchaseDate, setPurchaseDate] = useState(
    existingItem?.purchase_date
      ? new Date(existingItem.purchase_date).toISOString().split("T")[0]
      : ""
  );
  const [warrantyExpiry, setWarrantyExpiry] = useState(
    existingItem?.warranty_expiry_date
      ? new Date(existingItem.warranty_expiry_date).toISOString().split("T")[0]
      : ""
  );

  const [images, setImages] = useState<InventoryItemImage[]>([]);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (existingItem) {
      // Need to fetch full item to get images
      fetch(`/api/inventory/items/${existingItem.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.images) setImages(data.images);
        });
    }
  }, [existingItem]);

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // For simplicity in this early version, we just support creation and then photo upload immediately,
      // or editing fields (if endpoint existed). Since we only mapped POST, let's just do creation if new.
      const url = "/api/inventory/items";
      const method = "POST";
      // To support PUT we need to implement the PUT endpoint. For MVP, we'll allow creation.
      if (existingItem) {
        alert("Editing fields not mapped in MVP yet. Proceeding.");
        // Actually, you could update existingItem if PUT was implemented.
        return onClose();
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          name,
          description,
          tags,
          purchaseDate: purchaseDate || null,
          warrantyExpiryDate: warrantyExpiry || null,
        }),
      });

      if (res.ok) {
        const newItem = await res.json();
        // Upload any pending images
        for (const file of pendingImages) {
          const formData = new FormData();
          formData.append("file", file);
          await fetch(`/api/inventory/items/${newItem.id}/images`, {
            method: "POST",
            body: formData,
          });
        }
        onSaved();
        onClose();
      }
    } catch (err) {
      console.error(err);
    }
  };

   const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!existingItem) {
      // Store in pending for creation
      setPendingImages([...pendingImages, file]);
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(
        `/api/inventory/items/${existingItem.id}/images`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (res.ok) {
        const newImg = await res.json();
        setImages([...images, newImg]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingItem) return;
    if (!window.confirm(t("confirmDelete"))) return;
    try {
      const res = await fetch(`/api/inventory/items/${existingItem.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onSaved();
        onClose();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      const res = await fetch(`/api/inventory/items/images/${imageId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setImages((prev) => prev.filter((img) => img.id !== imageId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h3>{existingItem ? existingItem.name : t("addItem")}</h3>
        <form onSubmit={handleSave} className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label>{t("name")}</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!!existingItem}
            />
          </div>

          <div className={styles.formGroup}>
            <label>{t("description")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!!existingItem}
            />
          </div>

          <div className={styles.formGroup}>
            <label>{t("tags")} (Press Enter)</label>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              {tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    background: "#e2e8f0",
                    padding: "4px 8px",
                    borderRadius: "16px",
                    fontSize: "0.85rem",
                    display: "flex",
                    gap: "4px",
                  }}
                >
                  {tag}
                  {!existingItem && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
            {!existingItem && (
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Type and hit enter..."
              />
            )}
          </div>

          <div style={{ display: "flex", gap: "16px" }}>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label>{t("purchaseDate")}</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                disabled={!!existingItem}
              />
            </div>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label>{t("warrantyExpiry")}</label>
              <input
                type="date"
                value={warrantyExpiry}
                onChange={(e) => setWarrantyExpiry(e.target.value)}
                disabled={!!existingItem}
              />
            </div>
          </div>

          <div className={styles.formGroup} style={{ marginTop: "16px" }}>
              <label>{t("images")} (Read Only & Upload extension)</label>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  overflowX: "auto",
                  paddingBottom: "8px",
                }}
              >
                {/* Show pending images for new item */}
                {!existingItem && pendingImages.map((file, idx) => (
                  <div key={idx} style={{ position: "relative", minWidth: "100px" }}>
                    <img 
                       src={URL.createObjectURL(file)} 
                       alt="Pending" 
                       width={100} 
                       height={100} 
                       style={{ objectFit: "cover", borderRadius: "8px" }} 
                    />
                    <button
                      type="button"
                      onClick={() => setPendingImages(pendingImages.filter((_, i) => i !== idx))}
                      style={{
                        position: "absolute",
                        top: "-5px",
                        right: "-5px",
                        background: "red",
                        color: "white",
                        border: "none",
                        borderRadius: "50%",
                        width: "20px",
                        height: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}

                {images.map((img) => (
                  <div key={img.id} style={{ position: "relative", minWidth: "100px" }}>
                    <Image
                      src={img.blob_url}
                      alt="Item"
                      width={100}
                      height={100}
                      style={{
                        objectFit: "cover",
                        borderRadius: "8px",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(img.id)}
                      style={{
                        position: "absolute",
                        top: "-5px",
                        right: "-5px",
                        background: "red",
                        color: "white",
                        border: "none",
                        borderRadius: "50%",
                        width: "20px",
                        height: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        cursor: "pointer",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}

                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100px",
                    height: "100px",
                    border: "1px dashed #ccc",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  <Upload size={20} />
                  <span style={{ fontSize: "0.75rem", marginTop: "4px" }}>
                    Upload
                  </span>
                  <input
                    type="file"
                    style={{ display: "none" }}
                    onChange={handleFileUpload}
                    accept="image/*"
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>

          <div className={styles.modalActions}>
            <Button type="button" variant="secondary" onClick={onClose}>
              {t("cancel")}
            </Button>
            {existingItem ? (
              <Button type="button" onClick={handleDelete} style={{ backgroundColor: "red", color: "white" }}>
                {t("delete")}
              </Button>
            ) : (
              <Button type="submit">{t("save")}</Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
