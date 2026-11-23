import numpy as np,sys
from scipy.spatial import ConvexHull
from r16_lib import fib
def classify(P,c):
    h=ConvexHull(P); tri=h.simplices; eq=h.equations  # n.x+off<=0
    n=eq[:,:3]; d=-eq[:,3]; H=d-n@c
    C=n@n.T; ok=(C*H[:,None]<H[None,:]-1e-12); np.fill_diagonal(ok,True); S=int(ok.all(1).sum())
    # peaks: vertex v, neighbours
    V=len(P); nb=[set() for _ in range(V)]
    for t in tri:
        for a in t:
            for b in t:
                if a!=b: nb[a].add(b)
    U=sum(1 for v in range(V) if all((P[w]-P[v])@(P[v]-c)<0 for w in nb[v]))
    return S,U,H.min()>0,len(tri)
if __name__=='__main__':
    for N in (12,20,32,52):
        P=fib(N)
        for dl in (0.2,0.35,0.5,0.65,0.8):
            res=[classify(P,np.array([0,0,dl])) ,classify(P,dl*np.array([np.sin(.3),0,np.cos(.3)]))]
            print(N,dl,res)
