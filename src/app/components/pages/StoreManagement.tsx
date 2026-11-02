          .eq('vendor_id', vendorId);

      if (profileError) throw profileError;

      setQrCodeUrl(publicUrl);
      showToast('Payment QR uploaded successfully.', 'success');
    } catch (error: any) {
      console.error('QR upload error:', error);
      showToast(
        error?.message || 'Failed to upload payment QR.',
        'error'
      );
    } finally {
      setUploadingQr(false);
      event.target.value = '';
    }
  };

  const saveBankDetails = async () => {
    if (!vendorId) return;

    if (!qrCodeUrl.trim()) {
      throw new Error(
        'Please upload the vendor payment QR code before saving bank details.'
      );
    }

    const res =
      await updateBankDetails(
        vendorId,
        {
          account_holder_name: accountHolderName,
          bank_name: bankName,
          account_number: accountNumber,
          ifsc_code: ifscCode,
          upi_id: upiId,
          qr_code_url: qrCodeUrl.trim()
        }
      );

    if (!res.success) {
      throw new Error(
        res.error || 'Failed to save bank details.'
      );
    }
  };

  // ---------------------------------------------------------------------------
  // SAVE EVERYTHING
  // ---------------------------------------------------------------------------

  const handleSaveAll = async () => {
    if (!vendorId) return;

    setIsSavingAll(true);

    try {
      await saveStoreInfo();
      await saveLocation();
      await saveOperations();
      await saveDocuments();
      await saveBankDetails();

      showToast(
        'Store settings updated successfully.',
        'success'
      );
    } catch (err: any) {
      showToast(
        err.message ||
          'Error saving changes.',
        'error'
      );
    } finally {
      setIsSavingAll(false);
    }
  };

  // ---------------------------------------------------------------------------
  // LOADING
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-8 p-6 max-w-(--size-breakpoint-md) mx-auto min-h-screen transition-colors duration-200">

      {/* TOAST */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white font-medium transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-slate-900 border border-emerald-500/30'
              : 'bg-rose-600'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle
              size={16}
              className="text-emerald-500"
            />
          ) : (
            <AlertCircle size={16} />
          )}

          <span className="text-sm">
            {toast.message}
          </span>
        </div>
      )}

      {/* FEATURE NAVIGATION */}
      <div className="sticky top-0 z-30 -mx-1 px-1 pt-1 pb-2 bg-background/95 backdrop-blur">
        <div className="rounded-2xl border border-border bg-card p-2 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "store-info", label: "Store Details", icon: Store },
              { id: "store-location", label: "Location", icon: Navigation },
              { id: "store-hours", label: "Hours", icon: CalendarDays },
              { id: "store-documents", label: "Documents", icon: FileText },
              { id: "store-bank", label: "Bank & Payments", icon: Wallet },
              { id: "store-picker", label: "Picker", icon: Users },
              { id: "store-lanes", label: "Lanes & Racks", icon: Boxes },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() =>
                  document.getElementById(id)?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px] font-bold text-foreground hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 transition-colors"
              >
                <Icon className="h-3.5 w-3.5 text-emerald-500" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* HEADER */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Store Management
          </h1>

          <p className="text-slate-500 text-sm mt-1">
            Manage your store details, weekly schedules, and business verification
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          disabled={isSavingAll}
          className="h-10 px-5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-xs shadow-emerald-500/10 flex items-center gap-1.5 cursor-pointer"
        >
          {isSavingAll && (
            <Loader2
              size={14}
              className="animate-spin"
            />
          )}

          Save All Changes
        </button>
      </div>

      <div className="space-y-8">

        {/* ================================================================ */}
        {/* SECTION 1: STORE INFORMATION */}
        {/* ================================================================ */}

        <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-2xl p-6 shadow-xs space-y-6">

          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-900 pb-3">
            <Store
              className="text-emerald-500"
              size={18}
            />

            <h2 id="store-info" className="scroll-mt-24 text-base font-bold text-slate-900 dark:text-white">
              Store Information
            </h2>
          </div>

          <div className="space-y-5">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Store Name *
                </label>

                <input
                  type="text"
                  value={storeName}
                  onChange={e =>
                    setStoreName(
                      e.target.value
                    )
                  }
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Tagline
                </label>

                <input
                  type="text"
                  value={tagline}
                  onChange={e =>
                    setTagline(
                      e.target.value
                    )
                  }
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                />
              </div>

            </div>

            {/* CATEGORIES */}

            <div className="border border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl p-5 space-y-5">

              <div className="space-y-1.5">

                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Primary Category
                </label>

                {categoriesLoading ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400 py-1.5">
                    <Loader2
                      size={12}
                      className="animate-spin text-emerald-500"
                    />

                    Loading categories...
                  </div>
                ) : (
                  <select
                    value={
                      primaryCategoryId
                    }
                    onChange={
                      handlePrimaryCategoryChange
                    }
                    className="w-full h-10 px-3 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                  >
                    <option
                      value=""
                      disabled
                    >
                      Select Category ▼
                    </option>

                    {availableCategories.map(
                      cat => (
                        <option
                          key={cat.id}
                          value={cat.id}
                        >
                          {cat.name}
                        </option>
                      )
                    )}
                  </select>
                )}

              </div>

              <div className="space-y-2.5">

                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Additional Categories
                </label>

                <div className="relative">

                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                  <input
                    type="text"
                    value={
                      categorySearch
                    }
                    onChange={e =>
                      setCategorySearch(
                        e.target.value
                      )
                    }
                    placeholder="Search Categories"
                    className="w-full h-10 pl-9 pr-3 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                  />

                </div>

                <div className="max-h-40 overflow-y-auto border border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-955 rounded-xl p-3 grid grid-cols-2 gap-2 scrollbar-thin">

                  {filteredAvailableCategories.length > 0 ? (
                    filteredAvailableCategories.map(
                      cat => {
                        const isChecked =
                          additionalCategoryNames.includes(
                            cat.name.trim()
                          );

                        return (
                          <label
                            key={cat.id}
                            className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg cursor-pointer transition text-sm select-none text-slate-700 dark:text-slate-300"
                          >
                            <input
                              type="checkbox"
                              checked={
                                isChecked
                              }
                              onChange={() =>
                                handleToggleAdditionalCategory(
                                  cat.name
                                )
                              }
                              className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500/20 w-4 h-4 transition-colors"
                            />

                            <span>
                              {cat.name}
                            </span>
                          </label>
                        );
                      }
                    )
                  ) : (
                    <span className="text-xs text-slate-400 italic p-1">
                      No matching categories found
                    </span>
                  )}

                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">

                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Selected Categories
                </label>

                {allSelectedCategoryNames.length > 0 ? (
                  <div className="flex flex-wrap gap-2 animate-in fade-in duration-200">

                    {allSelectedCategoryNames.map(
                      (name, i) => {
                        const primaryObj =
                          availableCategories.find(
                            c =>
                              c.id ===
                              primaryCategoryId
                          );

                        const isPrimary =
                          primaryObj &&
                          primaryObj.name.trim() ===
                            name;

                        return (
                          <span
                            key={i}
                            className={`text-xs font-medium px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all select-none ${
                              isPrimary
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold'
                                : 'bg-white dark:bg-slate-955 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <Tag
                              size={12}
                              className={
                                isPrimary
                                  ? 'text-emerald-500'
                                  : 'text-slate-400'
                              }
                            />

                            <span>
                              {name}{' '}
                              {isPrimary && (
                                <span className="text-[10px] opacity-70 uppercase tracking-wide ml-0.5">
                                  (Primary)
                                </span>
                              )}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveCategoryPill(
                                  name
                                )
                              }
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-0.5 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        );
                      }
                    )}

                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">
                    No categories selected.
                  </span>
                )}

              </div>

            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* SECTION 2: STORE LOCATION */}
        {/* ================================================================ */}

        <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-900 pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="text-emerald-500" size={18} />
              <h2 id="store-location" className="scroll-mt-24 text-base font-bold text-slate-900 dark:text-white">Store Location</h2>
            </div>
            {isLocationVerified ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-500/20">
                <Check size={14} /> Store Location Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-full border border-amber-500/20">
                <AlertTriangle size={14} /> Store location not selected
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">📍 Select Exact Store Location</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Select the physical store pin on the map.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLocationPickerOpen(true)}
              className="h-10 px-4 bg-emerald-500 hover:bg-emerald-600 text-white transition rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs shadow-emerald-500/10 shrink-0"
            >
              <MapPin size={16} />
              {isLocationVerified ? 'Change Location' : 'Open Map Picker'}
            </button>
          </div>

          {isLocationVerified && (
            <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider mb-2">
                <CheckCircle size={14} /> Selected Store Location
              </div>
              {(() => {
                const normalizePart = (value: string) =>
                  value.trim().replace(/\s+/g, " ").replace(/^,|,$/g, "").trim();
                const line1Parts = addressLine1.split(",").map(normalizePart).filter(Boolean);
                const line2Parts = addressLine2.split(",").map(normalizePart).filter(Boolean);
                const existingLocalities = [...line1Parts, ...line2Parts].map(part => part.toLocaleLowerCase());
                const cityPart = normalizePart(city);
                const remainingParts = [
                  ...line1Parts,
                  ...line2Parts,
                  ...(cityPart && !existingLocalities.includes(cityPart.toLocaleLowerCase()) ? [cityPart] : []),
                  normalizePart(state),
                  normalizePart(pinCode),
                ].filter(Boolean);
                const uniqueParts = remainingParts.filter((part, index, parts) =>
                  parts.findIndex(candidate => candidate.toLocaleLowerCase() === part.toLocaleLowerCase()) === index
                );
                return (
                  <div className="text-slate-800 dark:text-slate-200 font-medium">
                    {uniqueParts.join(", ")}
                  </div>
                );
              })()}
            </div>
          )}
        </section>

        {/* ================================================================ */}
        {/* SECTION 3: BUSINESS HOURS */}
        {/* ================================================================ */}

        <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-2xl p-6 shadow-xs space-y-6">

          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-900 pb-3">

            <Clock
              className="text-emerald-500"
              size={18}
            />

            <h2 id="store-hours" className="scroll-mt-24 text-base font-bold text-slate-900 dark:text-white">
              Business Hours
            </h2>

          </div>

          {/* LIVE STATUS */}

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/50 space-y-4">

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

              <div className="space-y-1">

                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Current Live Status
                </span>

                <div className="flex items-center gap-3 flex-wrap">

                  <span
                    className={`inline-flex items-center rounded-xl border px-3 py-1.5 text-xs font-black ${currentEvaluation.badgeColor}`}
                  >
                    {currentEvaluation.badgeText}
                  </span>

                  {manualOverride && (
                    <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                      Manual Override Active
                    </span>
                  )}

                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-white p-3.5 dark:bg-slate-955 border border-slate-200/60 dark:border-slate-800">

                <Clock className="h-5 w-5 text-emerald-500 shrink-0" />

                <div>

                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {currentEvaluation.isOperational
                      ? 'Closes In'
                      : 'Status Info'}
                  </p>

                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    {currentEvaluation.countdownText}
                  </p>

                </div>

              </div>

            </div>

            {/* 90-MINUTE WARNING */}

            {currentEvaluation.isOperational &&
              currentEvaluation.minsUntilClose <=
                90 &&
              currentEvaluation.minsUntilClose >
                0 && (
                <div className="mt-2">

                  {currentEvaluation.minsUntilClose <=
                  30 ? (
                    <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 text-xs font-bold">

                      <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />

                      <span>
                        ⚠️ Store closes in{' '}
                        {
                          currentEvaluation.minsUntilClose
                        }{' '}
                        minutes. Prepare to fulfill pending orders.
                      </span>

                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 rounded-xl border border-orange-200 bg-orange-50 p-3 text-orange-800 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-300 text-xs font-bold">

                      <AlertTriangle className="h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400" />

                      <span>
                        ⚠️ Your store will automatically close in{' '}
                        {
                          currentEvaluation.countdownText
                        }.
                      </span>

                    </div>
                  )}

                </div>
              )}

          </div>

          {/* MANUAL CONTROLS */}

          <div className="space-y-3">

            <div className="flex items-center justify-between">

              <div>

                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Manual Store Controls
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Override weekly schedule directly.
                </p>

              </div>

              {manualOverride && (
                <button
                  type="button"
                  onClick={
                    handleResetToAuto
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 transition"
                >
                  <Power className="h-3.5 w-3.5 text-emerald-500" />
                  Resume Auto Schedule
                </button>
              )}

            </div>

            <div className="grid grid-cols-3 gap-3">

              <button
                type="button"
                onClick={() =>
                  handleManualStatusChange(
                    'open'
                  )
                }
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 font-bold text-xs transition ${
                  storeStatus === 'open' &&
                  manualOverride
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                Open
              </button>

              <button
                type="button"
                onClick={() =>
                  handleManualStatusChange(
                    'busy'
                  )
                }
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 font-bold text-xs transition ${
                  storeStatus === 'busy' &&
                  manualOverride
                    ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                <AlertTriangle className="h-4 w-4" />
                Busy
              </button>

              <button
                type="button"
                onClick={() =>
                  handleManualStatusChange(
                    'closed'
                  )
                }
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 font-bold text-xs transition ${
                  storeStatus === 'closed' &&
                  manualOverride
                    ? 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                <XCircle className="h-4 w-4" />
                Closed
              </button>

            </div>
          </div>

          {/* WEEKLY SCHEDULE */}

          <div className="space-y-4 pt-2">

            <div className="flex items-center gap-2">

              <Calendar className="h-4 w-4 text-emerald-500" />

              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Weekly Operating Schedule
              </h3>

            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-900 border border-slate-100 dark:border-slate-900 rounded-2xl px-4 bg-slate-50/30 dark:bg-slate-900/20">

              {DAYS_OF_WEEK.map(
                day => {
                  const daySchedule =
                    schedule[day] || {
                      open: '09:00',
                      close: '22:00',
                      closed: false
                    };

                  const isClosed =
                    daySchedule.closed;

                  return (
                    <div
                      key={day}
                      className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                    >

                      <div className="flex items-center justify-between sm:w-40">

                        <span className="text-xs font-bold capitalize text-slate-900 dark:text-white">
                          {day}
                        </span>

                        <label className="relative inline-flex cursor-pointer items-center">

                          <input
                            type="checkbox"
                            checked={
                              !isClosed
                            }
                            onChange={() =>
                              handleDayToggle(
                                day
                              )
                            }
                            className="peer sr-only"
                          />

                          <div className="peer h-5 w-9 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-slate-800" />

                        </label>

                      </div>

                      {!isClosed ? (
                        <div className="flex items-center gap-3">

                          <div className="flex items-center gap-2">

                            <span className="text-[11px] font-bold text-slate-400">
                              Open:
                            </span>

                            <input
                              type="time"
                              value={
                                daySchedule.open
                              }
                              onChange={e =>
                                handleTimeChange(
                                  day,
                                  'open',
                                  e.target
                                    .value
                                )
                              }
                              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-955 dark:text-white"
                            />

                          </div>

                          <span className="text-slate-300 dark:text-slate-700">
                            –
                          </span>

                          <div className="flex items-center gap-2">

                            <span className="text-[11px] font-bold text-slate-400">
                              Close:
                            </span>

                            <input
                              type="time"
                              value={
                                daySchedule.close
                              }
                              onChange={e =>
                                handleTimeChange(
                                  day,
                                  'close',
                                  e.target
                                    .value
                                )
                              }
                              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-955 dark:text-white"
                            />

                          </div>

                        </div>
                      ) : (
                        <span className="text-xs font-extrabold text-slate-400 italic">
                          Closed All Day
                        </span>
                      )}

                    </div>
                  );
                }
              )}

            </div>
          </div>

        </section>

        {/* ================================================================ */}
        {/* SECTION 4: BUSINESS DOCUMENTS */}
        {/* ================================================================ */}

        <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-2xl p-6 shadow-xs space-y-6">

          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-900 pb-3">

            <FileText
              className="text-emerald-500"
              size={18}
            />

            <h2 id="store-documents" className="scroll-mt-24 text-base font-bold text-slate-900 dark:text-white">
              Business Documents
            </h2>

          </div>

          <div className="space-y-4">

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  PAN Number
                </label>

                <input
                  type="text"
                  value={panNumber}
                  onChange={e =>
                    setPanNumber(
                      e.target.value
                    )
                  }
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  GST Number
                </label>

                <input
                  type="text"
                  value={gstNumber}
                  onChange={e =>
                    setGstNumber(
                      e.target.value
                    )
                  }
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  FSSAI License
                </label>

                <input
                  type="text"
                  value={fssaiLicense}
                  onChange={e =>
                    setFssaiLicense(
                      e.target.value
                    )
                  }
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-mono"
                />
              </div>

            </div>

            {displaysDrugLicense && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-dashed border-slate-100 dark:border-slate-900">

                <div className="space-y-1.5">

                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Drug License Number
                  </label>

                  <input
                    type="text"
                    value={drugLicense}
                    onChange={e =>
                      setDrugLicense(
                        e.target.value
                      )
                    }
                    className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-mono"
                  />

                </div>

                <div className="space-y-1.5">

                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Drug License Expiry
                  </label>

                  <input
                    type="date"
                    value={
                      drugLicenseExpiry
                    }
                    onChange={e =>
                      setDrugLicenseExpiry(
                        e.target.value
                      )
                    }
                    className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                  />

                </div>

              </div>
            )}

          </div>
        </section>

        {/* ================================================================ */}
        {/* SECTION 5: BANK DETAILS */}
        {/* ================================================================ */}

        <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-900 pb-3">
            <Building2 className="text-emerald-500" size={18} />
            <div>
              <h2 id="store-bank" className="scroll-mt-24 text-base font-bold text-slate-900 dark:text-white">Bank & Payment Details</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">These details are used by Rivo for vendor settlements.</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Account Holder Name</label>
                <input type="text" value={accountHolderName} onChange={e => setAccountHolderName(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Bank Name</label>
                <input type="text" value={bankName} onChange={e => setBankName(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Account Number</label>
                <input type="text" value={accountNumber} onChange={e => setAccountNumber(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-mono" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">IFSC Code</label>
                <input type="text" value={ifscCode} onChange={e => setIfscCode(e.target.value.toUpperCase())}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-mono uppercase" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">UPI ID</label>
                <input type="text" value={upiId} onChange={e => setUpiId(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-mono" />
              </div>
            </div>

            <div className="rounded-2xl border border-amber-300/60 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/20 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Vendor Payment QR <span className="text-red-500">*</span></p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Upload the QR code for the account where Rivo should send your vendor settlement. Admin will use the saved QR when processing your payout.
                  </p>
                </div>
                <div className="shrink-0 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider">Required</div>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  type="button"
                  onClick={() => qrFileInputRef.current?.click()}
                  disabled={uploadingQr}
                  className="h-10 px-4 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-900 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white hover:bg-emerald-50 dark:hover:bg-slate-800 transition flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
                >
                  {uploadingQr ? <Loader2 size={14} className="animate-spin text-emerald-500" /> : <Upload size={14} className="text-emerald-500" />}
                  Upload Payment QR
                </button>

                <input ref={qrFileInputRef} type="file" accept="image/*" onChange={handleQrUpload} className="hidden" />

                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {qrCodeUrl ? 'QR uploaded and saved.' : 'No payment QR uploaded yet.'}
                </span>
              </div>

              {qrCodeUrl && (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-white dark:bg-slate-900 p-3">
                  <div className="w-20 h-20 bg-white rounded-lg border border-slate-200 p-1 flex items-center justify-center shrink-0">
                    <img src={qrCodeUrl} alt="Vendor payment QR" className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Payment QR saved</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Stored in your vendor profile for settlement processing.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

      {/* RIVOCITY PICKER & OPTIONAL STORE LAYOUT */}

      <section id="store-lanes" className="space-y-4 scroll-mt-24">
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-2xl p-6 shadow-xs">
          <div>
            <h2 id="store-picker" className="scroll-mt-24 text-base font-bold text-slate-900 dark:text-white">RivoCity Picker & Store Operations</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Picker management, optional lanes/racks, product locations and helper requests. None of these are required to add products.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOperationsView("picker")}
            className={`h-10 rounded-xl px-4 text-sm font-bold transition ${operationsView === "picker" ? "bg-emerald-600 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"}`}
          >
            Picker
          </button>
          <button
            type="button"
            onClick={() => setOperationsView("layout")}
            className={`h-10 rounded-xl px-4 text-sm font-bold transition ${operationsView === "layout" ? "bg-emerald-600 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"}`}
          >
            Lanes &amp; Racks
          </button>
        </div>
        {operationsView === "picker" ? <LanePicking /> : <StoreLayout />}
      </section>

      </div>

      {/* LOCATION PICKER */}
      <StoreLocationPicker
        open={locationPickerOpen}
        initialLatitude={latitude ? Number(latitude) : null}
        initialLongitude={longitude ? Number(longitude) : null}
        onClose={() => setLocationPickerOpen(false)}
        onConfirm={handleLocationConfirm}
      />
    </div>
  );
}