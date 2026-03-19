      'use client';
      
      import { useState, useMemo, useEffect } from 'react';
      import { useUser, useFirestore } from '@/firebase';
      import { useCollection } from '@/firebase/firestore/use-collection';
      import {
        collection,
        query,
        where,
        serverTimestamp,
        addDoc,
        updateDoc,
        doc,
      } from 'firebase/firestore';
      import { Button } from './ui/button';
      import { Input } from './ui/input';
      import { Label } from './ui/label';
      import { useToast } from '@/hooks/use-toast';
      import { Loader2, KeyRound } from 'lucide-react';
      import { useRouter } from 'next/navigation';
      import { errorEmitter } from '@/firebase/error-emitter';
      import { FirestorePermissionError } from '@/firebase/errors';
      import {
        Card,
        CardContent,
        CardDescription,
        CardHeader,
        CardTitle,
      } from '@/components/ui/card';
      import {
        AlertDialog,
        AlertDialogAction,
        AlertDialogCancel,
        AlertDialogContent,
        AlertDialogDescription,
        AlertDialogFooter,
        AlertDialogHeader,
        AlertDialogTitle,
      } from '@/components/ui/alert-dialog';

      type BridgeRequest = {
        uid: string;
        email: string;
        fullName: string;
        status: 'pending' | 'approved' | 'rejected';
        requestedAt: any;
      };
      
      export function BridgeApplication({ applicantId }: { applicantId: string }) {
        const { user, loading: userLoading } = useUser();
        const firestore = useFirestore();
        
        const { toast } = useToast();
        const router = useRouter();
      
        const [isRequesting, setIsRequesting] = useState(false);
        const [isClaiming, setIsClaiming] = useState(false);
        const [hasRequestedLocal, setHasRequestedLocal] = useState(false);
        const [bridgeToken, setBridgeToken] = useState('');
        
        // This keeps track of whether the user explicitly dismissed the modal for the current session.
        const [dismissedWelcome, setDismissedWelcome] = useState(false);
        // This controls the AlertDialog open state
        // It's initially true if no requests are loading and no existing request, to prompt new users.
        // Its value will be updated by the useEffect below and by user interaction.
        const [showWelcomeModal, setShowWelcomeModal] = useState(false);

        // Fetch any existing bridge requests for this user using the old structure 'bridge_requests'
        const applicantQuery = useMemo(() => {
            if (!firestore || !user) return undefined;
            return query(collection(firestore, 'bridge_requests'), where('uid', '==', user.uid));
        }, [user, firestore]);
      
        const { data: bridgeRequests, loading: bridgeRequestsLoading } =
          useCollection<BridgeRequest>(applicantQuery);
          
        const latestRequest = useMemo(() => {
            if (!bridgeRequests || bridgeRequests.length === 0) return null;
            return [...bridgeRequests].sort((a, b) => {
                const timeA = a.requestedAt?.toMillis() || 0;
                const timeB = b.requestedAt?.toMillis() || 0;
                return timeB - timeA;
            })[0];
        }, [bridgeRequests]);
          
        const hasExistingRequest = !!latestRequest;
        const isApproved = latestRequest?.status === 'approved';
        const showVerification = (hasExistingRequest && !isApproved) || hasRequestedLocal;
        
        // Effect to control the welcome modal's opening for new users
        useEffect(() => {
            // If user data, firestore, and bridge requests are all loaded,
            // and there's no existing request, no local request initiated, and it hasn't been dismissed,
            // then show the welcome modal.
            if (!userLoading && user && firestore && !bridgeRequestsLoading && !hasExistingRequest && !hasRequestedLocal && !dismissedWelcome) {
                setShowWelcomeModal(true);
            } else {
                // If any of the conditions to show the modal are no longer met (e.g., a request was made, or modal dismissed),
                // ensure the modal is closed.
                setShowWelcomeModal(false);
            }
        }, [userLoading, user, firestore, bridgeRequestsLoading, hasExistingRequest, hasRequestedLocal, dismissedWelcome]);
      
        const handleRequestUpdate = async (e: React.MouseEvent) => {
          e.preventDefault();
          if (!user || !firestore) return;
          setIsRequesting(true);
          
          try {
              const requestData = {
                uid: user.uid,
                email: user.email || '',
                fullName: user.displayName || user.email || '',
                status: 'pending',
                requestedAt: serverTimestamp(),
              };
              
              await addDoc(collection(firestore, 'bridge_requests'), requestData);
              
              setHasRequestedLocal(true);
              setShowWelcomeModal(false); // Close modal on submission
              
          } catch (error: any) {
            console.error('Error submitting bridge request:', error);
            if (error instanceof FirestorePermissionError) {
              errorEmitter.emit('permission-error', error);
            }
            toast({
              title: 'Error',
              description: 'Something went wrong. Please try again.',
              variant: 'destructive',
            });
          } finally {
            setIsRequesting(false);
          }
        };
      
        const handleClaimToken = async () => {
          if (!user || !firestore || !bridgeToken.trim()) return;
          setIsClaiming(true);
      
          try {
              const codeId = bridgeToken.trim().toUpperCase();
              const docRef = doc(firestore, 'bridge_codes', codeId);
      
              const claimData = {
                  isClaimed: true,
                  claimedByUid: user.uid,
              };
      
              await updateDoc(docRef, claimData);
              
              toast({
                  title: 'Success!',
                  description: 'Application data bridged successfully. Redirecting...',
              });
              
              setTimeout(() => {
                  router.push('/dashboard/application');
              }, 2000);
      
          } catch (error: any) {
              console.error('Error claiming token:', error);
              const permissionError = new FirestorePermissionError({
                  path: `bridge_codes/${bridgeToken.trim().toUpperCase()}`,
                  operation: 'update',
                  requestResourceData: { isClaimed: true, claimedByUid: user.uid },
              });
              errorEmitter.emit('permission-error', permissionError);
              
              toast({
                  variant: 'destructive',
                  title: 'Verification Failed',
                  description: 'The token is invalid or has expired.',
              });
          } finally {
              setIsClaiming(false);
          }
        };
      
        // Return null during critical loading phases to prevent UI flickering or incorrect rendering
        // This ensures a clean transition until all necessary data is loaded and evaluated.
        if (userLoading || !user || bridgeRequestsLoading || !firestore) {
          return null; 
        }
      
        if (isApproved) {
            return (
                <Card className="w-full max-w-2xl mx-auto shadow-lg border-accent">
                    <CardHeader className="text-center bg-accent/5 pb-6 pt-8">
                        <CardTitle className="text-2xl text-accent font-bold mb-2">Request Approved!</CardTitle>
                        <CardDescription className="text-base text-foreground max-w-lg mx-auto">
                            Please check your email for your unique bridge token, then enter it below to link your previous application data.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center py-8 space-y-4">
                        <div className="w-full max-w-sm space-y-2">
                            <Label htmlFor="bridgeToken">Bridge Token</Label>
                            <Input
                                id="bridgeToken"
                                placeholder="Enter your token here"
                                value={bridgeToken}
                                onChange={(e) => setBridgeToken(e.target.value)}
                                className="text-center font-mono tracking-widest text-lg py-6"
                            />
                        </div>
                        <Button 
                            size="lg" 
                            className="bg-accent hover:bg-accent/90 text-white font-semibold w-full max-w-sm"
                            onClick={handleClaimToken}
                            disabled={isClaiming || !bridgeToken.trim()}
                        >
                            {isClaiming ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
                            ) : (
                                <><KeyRound className="mr-2 h-4 w-4" /> Verify Token</>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            );
        }
      
        if (showVerification) {
            return (
                <Card className="w-full max-w-2xl mx-auto shadow-lg border-orange-500 bg-orange-50/50">
                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-2xl text-orange-700">Verification in Progress</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center pt-4">
                    <p className="text-lg text-muted-foreground">
                      We've received your request. Please check your email for your unique code (24-72 hours).
                    </p>
                  </CardContent>
                </Card>
            );
        }
      
        // Default state: no request has been made. Show the welcome modal trigger.
        return (
          <div className="mt-6 text-center w-full">
            <AlertDialog open={showWelcomeModal} onOpenChange={setShowWelcomeModal}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-2xl font-headline">
                    Welcome to the FedEx Pilot Portal
                  </AlertDialogTitle>
                  <AlertDialogDescription
                    asChild
                    className="pt-4 text-base text-left space-y-4 text-foreground/80"
                  >
                    <div>
                      <p>
                        We’re excited to have you. To bring over your flight hours and application data from our previous system, you’ll need a unique bridge code.
                      </p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDismissedWelcome(true)}>Not now</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleRequestUpdate}
                    disabled={isRequesting}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-lg px-8 py-6 rounded-full shadow-md transition-all hover:scale-105 w-full max-w-md"
                  >
                    {isRequesting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      'Yes, I want to continue my application'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            {/* If the modal is dismissed, show a button to reopen it or if it's not a new user display the standard bridge form.*/}
            {(!showWelcomeModal && !hasExistingRequest && !hasRequestedLocal) && (
                <Card className="w-full max-w-2xl mx-auto shadow-lg border-accent">
                    <CardHeader className="text-center bg-accent/5 pb-8 pt-8">
                        <CardTitle className="text-3xl text-accent font-bold mb-2">Welcome!</CardTitle>
                        <CardDescription className="text-lg text-foreground max-w-lg mx-auto">
                            We're excited to bring you on at FedEx. Let's get your profile updated.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center py-8 space-y-4">
                        <Button 
                            size="lg" 
                            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-lg px-8 py-6 rounded-full shadow-md transition-all hover:scale-105 w-full max-w-md"
                            onClick={() => setShowWelcomeModal(true)}
                        >
                            Yes, I want to update my application
                        </Button>
                        
                        <div className="flex items-center w-full max-w-md my-4">
                            <div className="flex-grow border-t border-border"></div>
                            <span className="flex-shrink mx-4 text-xs text-muted-foreground font-semibold uppercase">Already have a token?</span>
                            <div className="flex-grow border-t border-border"></div>
                        </div>
                        
                        <div className="w-full max-w-md flex space-x-2">
                            <Input
                                placeholder="Enter Bridge Token"
                                value={bridgeToken}
                                onChange={(e) => setBridgeToken(e.target.value)}
                                className="font-mono tracking-wider"
                            />
                            <Button 
                                variant="outline" 
                                onClick={handleClaimToken}
                                disabled={isClaiming || !bridgeToken.trim()}
                            >
                                {isClaiming ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Token'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
          </div>
        );
      }
      