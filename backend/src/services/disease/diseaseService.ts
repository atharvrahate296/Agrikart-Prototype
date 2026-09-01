/**
 * @fileoverview Disease Service - Express integrations for disease classification pipelines
 * @module src/services/disease/diseaseService
 */

import axios from 'axios';
import { createSupabaseAdminClient } from '../../config/supabase';
import { DatabaseError, NotFoundError, ValidationError, AuthorizationError } from '../../utils/errors.js';
import { PredictionFeedbackInput, ExpertVerificationInput } from '../../utils/disease-validators.js';

// FastAPI ML Service predict URL
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000/api';

/**
 * Upload image to Supabase storage and call ML service for disease prediction
 */
export async function predictDisease(
  userId: string,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  cropTypeHint?: string
): Promise<any> {
  try {
    const supabase = createSupabaseAdminClient();

    // 1. Upload file to Supabase Storage bucket 'disease-images'
    const storagePath = `${userId}/${Date.now()}_${fileName}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('disease-images')
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      throw new DatabaseError(`Storage upload failed: ${uploadError.message}`);
    }

    // 2. Fetch the public URL of the uploaded image
    const { data: urlData } = supabase.storage
      .from('disease-images')
      .getPublicUrl(storagePath);

    const imageUrl = urlData.publicUrl;

    // 3. Call the FastAPI ML Service
    let predictionResult: any;
    try {
      const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict/disease`, {
        image_url: imageUrl,
        crop_type: cropTypeHint || null,
      }, { timeout: 15000 });

      predictionResult = mlResponse.data?.prediction;
    } catch (mlError: any) {
      console.warn(`ML Service unavailable or failed: ${mlError.message}. Falling back to Express Mock Engine.`);
      
      // Standalone Express Mock engine fallback to prevent blocking if FastAPI is down
      const mockCrops = ['potato', 'tomato', 'apple', 'corn'];
      const crop = (cropTypeHint || mockCrops[Math.floor(Math.random() * mockCrops.length)]).toLowerCase();
      const mockDiseases: Record<string, string> = {
        potato: 'Potato Late Blight',
        tomato: 'Tomato Leaf Mold',
        apple: 'Apple Scab',
        corn: 'Corn Common Rust',
      };
      
      predictionResult = {
        crop_type: crop,
        predicted_disease: mockDiseases[crop] || 'Leaf Spot',
        confidence_score: 0.88,
        scientific_name: 'Mock Pathogen',
        model_version: 'express_mock_v1.0',
        is_mock: true,
      };
    }

    // 4. Match predicted disease against the local 'diseases' reference database catalog
    const { data: disease } = await supabase
      .from('diseases')
      .select('id, name, scientific_name, description, symptoms, causes, prevention_methods, treatment_methods')
      .ilike('name', `%${predictionResult.predicted_disease}%`)
      .limit(1)
      .maybeSingle();

    // 5. Store prediction details in the 'disease_predictions' table
    const { data: predictionRecord, error: insertError } = await supabase
      .from('disease_predictions')
      .insert([
        {
          farmer_id: userId,
          disease_id: disease?.id || null,
          image_url: imageUrl,
          image_size_bytes: fileBuffer.length,
          predicted_disease: predictionResult.predicted_disease,
          confidence_score: predictionResult.confidence_score,
          model_version: predictionResult.model_version,
          crop_type: predictionResult.crop_type,
          is_verified: false,
          verification_status: 'pending',
          metadata: {
            scientific_name: predictionResult.scientific_name,
            is_mock: predictionResult.is_mock || false,
          },
        },
      ])
      .select()
      .single();

    if (insertError || !predictionRecord) {
      throw new DatabaseError(`Failed to save prediction record: ${insertError?.message}`);
    }

    // 6. Cleanup: Delete the temporary image from Supabase storage to free space
    try {
      await supabase.storage
        .from('disease-images')
        .remove([storagePath]);
      console.log(`Cleaned up temp image: ${storagePath}`);
    } catch (cleanupErr: any) {
      // Don't block the response if cleanup fails — just log
      console.warn(`Failed to cleanup temp image ${storagePath}: ${cleanupErr.message}`);
    }

    return {
      ...predictionRecord,
      image_url: null, // Image was temporary and has been deleted
      disease_details: disease || {
        name: predictionResult.predicted_disease,
        scientific_name: predictionResult.scientific_name,
        description: 'No reference details available for this disease.',
        symptoms: 'Check symptoms guidelines.',
        causes: 'Unknown pathogens.',
        prevention_methods: [],
        treatment_methods: [],
      },
    };
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Disease prediction service failed: ${String(error)}`);
  }
}

/**
 * Fetch paginated prediction history for a user
 */
export async function getPredictionHistory(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<any[]> {
  try {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from('disease_predictions')
      .select(`
        *,
        disease:diseases(name, scientific_name, description)
      `)
      .eq('farmer_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new DatabaseError(`Failed to fetch prediction history: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Failed to fetch prediction history: ${String(error)}`);
  }
}

/**
 * Get details of a single prediction
 */
export async function getPredictionById(
  predictionId: string,
  userId: string,
  role: string
): Promise<any> {
  try {
    const supabase = createSupabaseAdminClient();

    const { data: prediction, error } = await supabase
      .from('disease_predictions')
      .select(`
        *,
        disease:diseases(*)
      `)
      .eq('id', predictionId)
      .single();

    if (error || !prediction) {
      throw new NotFoundError(`Prediction record not found: ${predictionId}`);
    }

    // Access authorization: farmer must own it, or role must be expert/admin
    if (prediction.farmer_id !== userId && !['expert', 'admin'].includes(role)) {
      throw new AuthorizationError('Not authorized to access this prediction');
    }

    return prediction;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError || error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Failed to retrieve prediction: ${String(error)}`);
  }
}

/**
 * Submit user feedback for a prediction
 */
export async function submitFeedback(
  userId: string,
  input: PredictionFeedbackInput
): Promise<any> {
  try {
    const supabase = createSupabaseAdminClient();

    // Verify prediction exists and is owned by the user
    const { data: prediction, error: predError } = await supabase
      .from('disease_predictions')
      .select('farmer_id')
      .eq('id', input.prediction_id)
      .single();

    if (predError || !prediction) {
      throw new NotFoundError(`Prediction record not found: ${input.prediction_id}`);
    }

    if (prediction.farmer_id !== userId) {
      throw new AuthorizationError('Not authorized to provide feedback on this prediction');
    }

    // Insert feedback record
    const { data: feedback, error } = await supabase
      .from('prediction_feedback')
      .insert([
        {
          prediction_id: input.prediction_id,
          farmer_id: userId,
          feedback_type: input.feedback_type,
          actual_disease_id: input.actual_disease_id || null,
          actual_disease_name: input.actual_disease_name || null,
          explanation: input.explanation || null,
          confidence_in_correction: input.confidence_in_correction || null,
          is_training_data: false, // Flag for data scientists to verify
        },
      ])
      .select()
      .single();

    if (error || !feedback) {
      throw new DatabaseError(`Failed to record prediction feedback: ${error?.message}`);
    }

    // Check threshold and trigger retraining
    await checkAndTriggerRetraining(supabase);

    return feedback;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError || error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Failed to submit feedback: ${String(error)}`);
  }
}

/**
 * Verify prediction (Expert only)
 */
export async function verifyPrediction(
  expertId: string,
  predictionId: string,
  input: ExpertVerificationInput
): Promise<any> {
  try {
    const supabase = createSupabaseAdminClient();

    // 1. Fetch prediction
    const prediction = await getPredictionById(predictionId, expertId, 'expert');

    // 2. Perform updates
    const updates: any = {
      is_verified: true,
      verification_status: input.verification_status,
      expert_notes: input.expert_notes || null,
      updated_at: new Date().toISOString(),
    };

    // If corrected, update the disease_id reference
    if (input.verification_status === 'corrected' && input.disease_id) {
      updates.disease_id = input.disease_id;
    }

    const { data: updated, error } = await supabase
      .from('disease_predictions')
      .update(updates)
      .eq('id', predictionId)
      .select()
      .single();

    if (error || !updated) {
      throw new DatabaseError(`Failed to verify prediction: ${error?.message}`);
    }

    // Mark associated feedback as training data if it exists
    await supabase
      .from('prediction_feedback')
      .update({ is_training_data: true })
      .eq('prediction_id', predictionId);

    // Check threshold and trigger retraining
    await checkAndTriggerRetraining(supabase);

    return updated;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof DatabaseError) throw error;
    throw new DatabaseError(`Failed to verify prediction: ${String(error)}`);
  }
}

/**
 * Triggers retraining pipeline on FastAPI ML service
 */
export async function triggerModelRetraining(
  epochs: number = 5,
  batchSize: number = 32,
  learningRate: number = 0.001
): Promise<any> {
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/train`, {
      epochs,
      batch_size: batchSize,
      learning_rate: learningRate,
    });
    return response.data;
  } catch (error: any) {
    console.error(`Failed to trigger model retraining: ${error.message}`);
    throw new DatabaseError(`Failed to trigger model retraining: ${error.message}`);
  }
}

/**
 * Checks count of verified predictions and/or feedback to trigger retraining automatically
 */
async function checkAndTriggerRetraining(supabase: any): Promise<void> {
  try {
    const resVerified = await supabase
      .from('disease_predictions')
      .select('*', { count: 'exact', head: true })
      .eq('is_verified', true);
    
    const verifiedCount = resVerified && typeof resVerified.count === 'number' ? resVerified.count : 0;

    const resFeedback = await supabase
      .from('prediction_feedback')
      .select('*', { count: 'exact', head: true })
      .eq('is_training_data', true);
    
    const feedbackCount = resFeedback && typeof resFeedback.count === 'number' ? resFeedback.count : 0;

    const totalSamples = verifiedCount + feedbackCount;

    if (totalSamples > 0 && totalSamples % 5 === 0) {
      console.log(`Auto retraining threshold crossed with ${totalSamples} samples. Triggering retraining...`);
      triggerModelRetraining().catch((err) => {
        console.error('Auto retraining trigger failed:', err.message);
      });
    }
  } catch (err: any) {
    console.error('Error checking retraining threshold:', err.message);
  }
}
